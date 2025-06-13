import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ElysiaApp } from "..";
import { ModLogType, sendGiftCodeRedeemMessage, sendModLogMessage } from "../libs/discord-notifier";
import { formatUUID, GameProfile } from "../libs/game-profiles";
import giftCodes, { createGiftCode } from "../database/schemas/gift-codes";
import players from "../database/schemas/players";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, status }) => { // Get gift code list
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return status(403, { error: i18n('error.notAllowed') });

    const codes = await giftCodes.find();

    return codes.map((code) => ({
        name: code.name,
        code: code.code,
        uses: code.uses.map((uuid) => formatUUID(uuid)),
        max_uses: code.max_uses,
        gift: {
            type: code.gift.type,
            value: code.gift.value,
            duration: code.gift.duration || null
        },
        created_at: code.created_at.getTime(),
        expires_at: code.expires_at?.getTime() || null
    }));
}, {
    detail: {
        tags: ['Gift codes'],
        description: 'Returns all gift codes'
    },
    response: {
        200: t.Array(t.Object({ name: t.String(), code: t.String(), uses: t.Array(t.String()), max_uses: t.Number(), gift: t.Object({ type: t.String(), value: t.String(), duration: t.Union([t.Number(), t.Null()]) }), created_at: t.Number(), expires_at: t.Union([t.Number(), t.Null()]) }), { description: 'A list of gift codes' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage gift codes' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).get('/:code', async ({ session, params, i18n, status }) => { // Get info of a specific code
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return status(403, { error: i18n('error.notAllowed') });
    
    const code = await giftCodes.findOne({ code: params.code });
    if(!code) return status(404, { error: i18n('gift_codes.not_found') });
    const { name, code: giftCode, uses, max_uses, gift, created_at, expires_at } = code;

    return { name, code: giftCode, uses: uses.map((uuid) => formatUUID(uuid)), max_uses, gift: { type: gift.type, value: gift.value, duration: gift.duration || null }, created_at: created_at.getTime(), expires_at: expires_at?.getTime() || null };
}, {
    detail: {
        tags: ['Gift codes'],
        description: 'Returns info about a specific gift code'
    },
    response: {
        200: t.Object({ name: t.String(), code: t.String(), uses: t.Array(t.String()), max_uses: t.Number(), gift: t.Object({ type: t.String(), value: t.String(), duration: t.Union([t.Number(), t.Null()]) }), created_at: t.Number(), expires_at: t.Union([t.Number(), t.Null()]) }, { description: 'The gift code info' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage gift codes' }),
        404: t.Object({ error: t.String() }, { description: 'The gift code was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ code: t.String({ description: 'The gift code' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/:code/redeem', async ({ session, params, i18n, status }) => { // Get info of a specific code
    if(!session || !session.uuid) return status(403, { error: i18n('error.notAllowed') });
    const player = await players.findOne({ uuid: session.uuid });
    if(!player) return status(403, { error: i18n('error.notAllowed') });

    const code = await giftCodes.findOne({ code: params.code });
    if(!code || !code.isValid()) return status(404, { error: i18n('gift_codes.not_found') });
    if(code.uses.includes(player.uuid)) return status(422, { error: i18n('gift_codes.already_redeemed') });

    const { success, expiresAt } = player.addRole({ name: code.gift.value, reason: `Gift code: ${code.code}`, autoRemove: false, duration: code.gift.duration });
    if(!success) return status(409, { error: i18n('gift_codes.already_have_role') });
    code.uses.push(player.uuid);
    await player.save();
    await code.save();
    
    sendGiftCodeRedeemMessage(await player.getGameProfile(), code, expiresAt);

    return { message: i18n(`gift_codes.redeemed_${expiresAt ? 'temporarily' : 'permanently'}`).replace('<role>', code.gift.value), expires_at: expiresAt?.getTime() || null };
}, {
    detail: {
        tags: ['Gift codes'],
        description: 'Redeems a gift code'
    },
    response: {
        200: t.Object({ message: t.String(), expires_at: t.Union([t.Number(), t.Null()]) }, { description: 'The gift code was redeemed' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not authenticated' }),
        404: t.Object({ error: t.String() }, { description: 'The gift code was not found' }),
        409: t.Object({ error: t.String() }, { description: 'You already have the reward role' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ code: t.String({ description: 'The gift code' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/', async ({ session, body: { name, code, role, max_uses: maxUses, code_expiration: codeExpiration, gift_duration: giftDuration }, i18n, status }) => { // Create a gift code
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return status(403, { error: i18n('error.notAllowed') });

    const codeExpiresAt = codeExpiration ? new Date(codeExpiration) : null;
    const giftExpiresAt = giftDuration || null;

    const giftCode = await createGiftCode({
        name: name.trim(),
        code: code?.trim() || undefined,
        maxUses,
        gift: {
            type: 'role',
            value: role,
            duration: giftExpiresAt
        },
        expiresAt: codeExpiresAt
    });

    sendModLogMessage({
        logType: ModLogType.CreateGiftCode,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        discord: false,
        code: name,
        role,
        maxUses,
        codeExpiration: codeExpiresAt,
        giftDuration: giftExpiresAt
    });

    return { message: i18n('gift_codes.created'), code: giftCode };
}, {
    detail: {
        tags: ['Gift codes'],
        description: 'Creates a new gift code'
    },
    response: {
        200: t.Object({ message: t.String(), code: t.String() }, { description: 'The gift code was created' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage gift codes' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: 'error.wrongType;;[["field", "name"], ["type", "string"]]' }), code: t.Optional(t.String({ error: 'error.wrongType;;[["field", "code"], ["type", "string"]]' })), role: t.String({ error: 'error.wrongType;;[["field", "role"], ["type", "string"]]' }), max_uses: t.Number({ error: 'error.wrongType;;[["field", "max_uses"], ["type", "number"]]' }), code_expiration: t.Optional(t.Number({ error: 'error.wrongType;;[["field", "code_expiration"], ["type", "number"]]' })), gift_duration: t.Optional(t.Number({ error: 'error.wrongType;;[["field", "gift_duration"], ["type", "number"]]' })) }, { error: 'error.invalidBody', additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/:code', async ({ session, params, i18n, status }) => { // Delete gift code
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return status(403, { error: i18n('error.notAllowed') });

    const code = await giftCodes.findOne({ code: params.code });
    if(!code) return status(404, { error: i18n('gift_codes.not_found') });
    await code.deleteOne();

    sendModLogMessage({
        logType: ModLogType.DeleteGiftCode,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        discord: false,
        code: code.name
    });

    return { message: i18n('gift_codes.deleted') };
}, {
    detail: {
        tags: ['Gift codes'],
        description: 'Deletes a gift code'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The gift code was deleted' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage gift codes' }),
        404: t.Object({ error: t.String() }, { description: 'The gift code was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ code: t.String({ description: 'The gift code' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});