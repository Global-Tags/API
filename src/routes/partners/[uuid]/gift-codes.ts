import { t } from "elysia";
import { tHeaders, tParams, tResponseBody, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { Partner } from "../../../libs/database/schemas/Partner";
import { Permission } from "../../../types/Permission";
import { ElysiaApp } from "../../..";
import { stripUUID } from "../../../libs/game-profiles";
import { formatGiftCodeSchema, GiftCodeDocument } from "../../../libs/database/schemas/GiftCode";

export default (app: ElysiaApp) => app.get('/', async ({ session, params: { uuid }, i18n, status }) => { // Get partner gift codes
    if(!session?.selfOrHasPermission(Permission.ViewGiftCodes)) return status(403, { error: i18n('$.error.notAllowed') });

    const partner = await Partner.findOne({ uuid: stripUUID(uuid) }).populate<{ gift_codes: GiftCodeDocument[] }>('gift_codes').lean();
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    return partner.gift_codes.map(code => formatGiftCodeSchema(code));
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Get partner gift codes',
    },
    response: {
        200: t.Array(tSchema.GiftCode, { description: 'A list of gift codes created by the partner' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.partnerUuid,
    headers: tHeaders
}).post('/', async ({ session, params, i18n, status }) => { // Create partner gift code
    if(!session?.selfOrHasPermission(Permission.CreateGiftCodes)) return status(403, { error: i18n('$.error.notAllowed') });

    const partner = await Partner.findOne({ uuid: stripUUID(params.uuid) }).populate<{ gift_codes: GiftCodeDocument[] }>('gift_codes');
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    const now = new Date();
    const createdCodesThisPeriod = partner.gift_codes.filter(code =>
        code.created_at.getMonth() === now.getMonth()
        && code.created_at.getFullYear() === now.getFullYear()
        && code.created_by === partner.uuid
    ).length;
    if(createdCodesThisPeriod >= 2) return status(429, { error: i18n('$.gift_codes.too_many_this_month') });

    const code = await partner.createGiftCode();
    await partner.save();

    // TODO: add log

    return formatGiftCodeSchema(code);
}, {
    detail: {
        tags: [DocumentationCategory.Partners, DocumentationCategory.GiftCodes],
        description: 'Create a partner gift code',
    },
    response: {
        200: tSchema.GiftCode,
        404: tResponseBody.Error,
        403: tResponseBody.Error,
        429: tResponseBody.Error
    },
    params: tParams.partnerUuid,
    headers: tHeaders
});