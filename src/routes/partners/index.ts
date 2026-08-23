import { t } from "elysia";
import { ElysiaApp } from "../..";
import { Permission } from "../../types/Permission";
import { formatUUID, stripUUID, uuidRegex } from "../../libs/game-profiles";
import { tHeaders, tRequestBody, tResponseBody, tSchema } from "../../libs/models";
import { Partner, PartnerIconType } from "../../libs/database/schemas/Partner";
import { DocumentationCategory } from "../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async () =>
    Promise.all((await Partner.find().sort({ joinedAt: 1 })).map(async partner => ({
        uuid: formatUUID(partner.uuid),
        name: partner.name,
        type: partner.type,
        redirect_url: partner.redirect_url,
        icon_url: partner.getIconUrl(),
        joined_at: partner.joined_at.getTime()
    }))), {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Get all partners'
    },
    response: {
        200: t.Array(tSchema.Partner, { description: 'A partner list' }),
        403: tResponseBody.Error,
    }
}).post('/', async ({ session, body: { uuid, name, type, redirect_url, discord_id, icon_type }, i18n, status }) => {
    if(!session?.player?.hasPermission(Permission.ManagePartners)) return status(403, { error: i18n('$.error.notAllowed') });

    uuid = stripUUID(uuid.trim());

    if(!uuidRegex.test(uuid)) return status(400, { error: i18n('$.partners.invalid_uuid') });
    if(await Partner.exists({ uuid })) return status(409, { error: i18n('$.partners.already_exists') });

    const joinedAt = new Date();
    joinedAt.setHours(0, 0, 0, 0);

    if(icon_type === PartnerIconType.Custom) icon_type = PartnerIconType.Skull; // icon does not exist on first creation

    const newPartner = await Partner.insertOne({
        uuid,
        name: name.trim(),
        type,
        redirect_url,
        icon_type,
        discord_id,
        joined_at: joinedAt
    });

    return status(201, {
        uuid: formatUUID(newPartner.uuid),
        name: newPartner.name,
        type: newPartner.type,
        redirect_url: newPartner.redirect_url,
        icon_url: newPartner.getIconUrl(),
        joined_at: newPartner.joined_at.getTime()
    });
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Create a new partner'
    },
    response: {
        201: tSchema.Partner,
        400: tResponseBody.Error,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    body: tRequestBody.CreatePartner,
    headers: tHeaders
});