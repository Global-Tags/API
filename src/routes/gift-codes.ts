import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ElysiaApp } from "..";
import { ModLogType, sendModLogMessage } from "../libs/discord-notifier";
import { formatUUID, GameProfile } from "../libs/game-profiles";
import giftCodes, { createGiftCode } from "../database/schemas/gift-codes";
import players from "../database/schemas/players";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, error }) => { // Get gift code list
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return error(403, { error: i18n('error.notAllowed') });

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
}).get('/:code', async ({ session, params, i18n, error }) => { // Get info of a specific code
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return error(403, { error: i18n('error.notAllowed') });
    
    const code = await giftCodes.findOne({ code: params.code });
    if(!code) return error(404, { error: i18n('gift_codes.not_found') });
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
}).post('/:code/redeem', async ({ session, params, i18n, error }) => { // Get info of a specific code
    if(!session || !session.uuid) return error(403, { error: i18n('error.notAllowed') });
    const player = await players.findOne({ uuid: session.uuid });
    if(!player) return error(403, { error: i18n('error.notAllowed') });

    const code = await giftCodes.findOne({ code: params.code });
    if(!code || !code.isValid()) return error(404, { error: i18n('gift_codes.not_found') });
    if(code.uses.includes(player.uuid)) return error(422, { error: i18n('gift_codes.already_redeemed') });

    let expiration: Date | null = null;
    const role = player.roles.find(role => role.name == code.gift.value);
    if(role) {
        if(!role.expires_at) return error(409, { error: i18n('gift_codes.already_have_role') });
        if(role.expires_at.getTime() > Date.now()) {
            expiration = code.gift.duration ? new Date(role.expires_at.getTime() + code.gift.duration) : null;
            role.reason += ` | Gift code: ${code.code}`;
            role.expires_at = expiration;
            await player.save();
        } else {
            expiration = code.gift.duration ? new Date(Date.now() + code.gift.duration) : null;
            role.expires_at = expiration;
            role.manually_added = false;
            role.reason = `Gift code: ${code.code}`;
            await player.save();
        }
    } else {
        expiration = code.gift.duration ? new Date(Date.now() + code.gift.duration) : null;
        player.roles.push({
            name: code.gift.value,
            added_at: new Date(),
            manually_added: false,
            reason: `Gift code: ${code.code}`,
            expires_at: expiration
        });
        await player.save();
    }
    code.uses.push(player.uuid);
    await code.save();

    return { message: i18n(`gift_codes.redeemed_${expiration ? 'temporarily' : 'permanently'}`).replace('<role>', code.gift.value), expires_at: expiration?.getTime() || null };
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
}).post('/', async ({ session, body: { name, role, max_uses: maxUses, code_expiration: codeExpiration, gift_duration: giftDuration }, i18n, error }) => { // Create a gift code
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return error(403, { error: i18n('error.notAllowed') });

    const codeExpiresAt = codeExpiration ? new Date(codeExpiration) : null;
    const giftExpiresAt = giftDuration || null;

    const code = await createGiftCode({
        name: name.trim(),
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

    return { message: i18n('gift_codes.created'), code };
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
    body: t.Object({ name: t.String({ error: 'error.wrongType;;[["field", "name"], ["type", "string"]]' }), role: t.String({ error: 'error.wrongType;;[["field", "role"], ["type", "string"]]' }), max_uses: t.Number({ error: 'error.wrongType;;[["field", "max_uses"], ["type", "number"]]' }), code_expiration: t.Optional(t.Number({ error: 'error.wrongType;;[["field", "code_expiration"], ["type", "number"]]' })), gift_duration: t.Optional(t.Number({ error: 'error.wrongType;;[["field", "gift_duration"], ["type", "number"]]' })) }, { error: 'error.invalidBody', additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/:code', async ({ session, params, i18n, error }) => { // Delete gift code
    if(!session?.hasPermission(Permission.ManageGiftCodes)) return error(403, { error: i18n('error.notAllowed') });

    const code = await giftCodes.findOne({ code: params.code });
    if(!code) return error(404, { error: i18n('gift_codes.not_found') });
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