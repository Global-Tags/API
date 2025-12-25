import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ElysiaApp } from "..";
import { ModLogType, sendGiftCodeRedeemMessage, sendModLogMessage } from "../libs/discord-notifier";
import { formatUUID } from "../libs/game-profiles";
import { createGiftCode, GiftCode, GiftType } from "../database/schemas/GiftCode";
import { tResponseBody, tHeaders, tParams, tRequestBody, tSchema } from "../libs/models";
import { DocumentationCategory } from "../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, status }) => { // Get gift code list
    if(!session?.player?.hasPermission(Permission.ViewGiftCodes)) return status(403, { error: i18n('$.error.notAllowed') });

    const codes = await GiftCode.find();

    return codes.map((code) => ({
        id: code.id,
        name: code.name,
        code: code.code,
        uses: code.uses.map((uuid) => formatUUID(uuid)),
        max_uses: code.max_uses,
        gift: {
            type: code.gift.type,
            value: code.gift.value,
            duration: code.gift.duration || null
        },
        created_by: formatUUID(code.created_by),
        created_at: code.created_at.getTime(),
        expires_at: code.expires_at?.getTime() || null
    }));
}, {
    detail: {
        tags: [DocumentationCategory.GiftCodes],
        description: 'Get all gift codes'
    },
    response: {
        200: t.Array(tSchema.GiftCode, { description: 'A gift code list' }),
        403: tResponseBody.Error
    },
    headers: tHeaders
}).get('/:code', async ({ session, params, i18n, status }) => { // Get a specific code
    if(!session?.player?.hasPermission(Permission.ViewGiftCodes)) return status(403, { error: i18n('$.error.notAllowed') });

    const code = await GiftCode.findOne({ $or: [{ id: params.id }, { code: params.id }] });
    if(!code) return status(404, { error: i18n('$.gift_codes.not_found') });
    const { id, name, code: giftCode, uses, max_uses, gift, created_by, created_at, expires_at } = code;

    return { id, name, code: giftCode, uses: uses.map((uuid) => formatUUID(uuid)), max_uses, gift: { type: gift.type, value: gift.value, duration: gift.duration || null }, created_by: formatUUID(created_by), created_at: created_at.getTime(), expires_at: expires_at?.getTime() || null };
}, {
    detail: {
        tags: [DocumentationCategory.GiftCodes],
        description: 'Get a specific gift code'
    },
    response: {
        200: tSchema.GiftCode,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.giftCodeId,
    headers: tHeaders
}).post('/:code/redeem', async ({ session, params, i18n, status }) => { // Redeem code
    if(!session?.player) return status(403, { error: i18n('$.error.notAllowed') });
    const { player } = session;
    if(!player) return status(403, { error: i18n('$.error.notAllowed') });

    const code = await GiftCode.findOne({ code: params.id });
    if(!code || !code.isValid()) return status(404, { error: i18n('$.gift_codes.not_found') });
    if(code.uses.includes(player.uuid)) return status(409, { error: i18n('$.gift_codes.already_redeemed') });

    const { success, expiresAt } = player.addRole({ id: code.gift.value, reason: `Gift code: ${code.code}`, autoRemove: false, duration: code.gift.duration });
    if(!success) return status(409, { error: i18n('$.gift_codes.already_have_role') });
    code.uses.push(player.uuid);
    await player.save();
    await code.save();
    
    sendGiftCodeRedeemMessage(await player.getGameProfile(), code, expiresAt);

    return { message: i18n(expiresAt ? '$.gift_codes.redeemed_temporarily' : '$.gift_codes.redeemed_permanently').replace('<role>', code.gift.value), expires_at: expiresAt?.getTime() || null };
}, {
    detail: {
        tags: [DocumentationCategory.GiftCodes],
        description: 'Redeem a gift code'
    },
    response: {
        200: tResponseBody.MessageWithExpiration,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    params: tParams.giftCodeId,
    headers: tHeaders
}).post('/', async ({ session, body: { name, code, role, max_uses: maxUses, code_expiration: codeExpiration, gift_duration: giftDuration }, i18n, status }) => { // Create a gift code
    if(!session?.player?.hasPermission(Permission.CreateGiftCodes)) return status(403, { error: i18n('$.error.notAllowed') });

    const codeExpiresAt = codeExpiration ? new Date(codeExpiration) : null;
    const giftExpiresAt = giftDuration || null;

    const giftCode = await createGiftCode({
        name: name.trim(),
        code: code?.trim() || undefined,
        maxUses,
        gift: {
            type: GiftType.Role,
            value: role,
            duration: giftExpiresAt
        },
        expiresAt: codeExpiresAt,
        createdBy: session.player.uuid
    });

    sendModLogMessage({
        logType: ModLogType.CreateGiftCode,
        staff: await session.player.getGameProfile(),
        discord: false,
        code: giftCode
    });

    return {
        id: giftCode.id,
        name: giftCode.name,
        code: giftCode.code,
        uses: giftCode.uses.map((uuid) => formatUUID(uuid)),
        max_uses: giftCode.max_uses,
        gift: {
            type: giftCode.gift.type,
            value: giftCode.gift.value,
            duration: giftCode.gift.duration || null
        },
        created_by: formatUUID(giftCode.created_by),
        created_at: giftCode.created_at.getTime(),
        expires_at: giftCode.expires_at?.getTime() || null
    };
}, {
    detail: {
        tags: [DocumentationCategory.GiftCodes],
        description: 'Create a new gift code'
    },
    response: {
        200: tSchema.GiftCode,
        403: tResponseBody.Error
    },
    body: tRequestBody.CreateGiftCode,
    headers: tHeaders
}) // TODO: Add route to patch an existing gift code
.delete('/:code', async ({ session, params, i18n, status }) => { // Delete gift code
    if(!session?.player?.hasPermission(Permission.DeleteGiftCodes)) return status(403, { error: i18n('$.error.notAllowed') });

    const code = await GiftCode.findOne({ id: params.id });
    if(!code) return status(404, { error: i18n('$.gift_codes.not_found') });
    await code.deleteOne();

    sendModLogMessage({
        logType: ModLogType.DeleteGiftCode,
        staff: await session.player.getGameProfile(),
        discord: false,
        code
    });

    return { message: i18n('$.gift_codes.deleted') };
}, {
    detail: {
        tags: [DocumentationCategory.GiftCodes],
        description: 'Delete a gift code'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.giftCodeId,
    headers: tHeaders
});