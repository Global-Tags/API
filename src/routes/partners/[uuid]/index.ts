import { t } from "elysia";
import { ElysiaApp } from "../../..";
import { Partner, PartnerIconType } from "../../../libs/database/schemas/Partner";
import { formatUUID, GameProfile, stripUUID } from "../../../libs/game-profiles";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { tHeaders, tRequestBody, tResponseBody, tSchema } from "../../../libs/models";
import { Permission } from "../../../types/Permission";
import { partnerIconFile } from "../../../libs/data-accessor";

export default (app: ElysiaApp) => app.get('/', async ({ params: { uuid }, i18n, status }) => {
    const partner = await Partner.findOne({ uuid: stripUUID(uuid) });
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    return {
        uuid: formatUUID(partner.uuid),
        name: partner.name,
        type: partner.type,
        redirect_url: partner.redirect_url,
        icon_url: partner.getIconUrl(),
        joined_at: partner.joined_at.getTime()
    };
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Get a specific partner'
    },
    response: {
        200: tSchema.Partner,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: t.Object({ uuid: t.String({ description: 'The partner UUID' }) }),
    headers: tHeaders,
}).patch('/', async ({ session, body: { name, type, redirect_url, discord_id, icon_type }, params: { uuid }, i18n, status }) => {
    if(!session?.selfOrHasPermission(Permission.ManagePartners)) return status(403, { error: i18n('$.error.notAllowed') });

    const partner = await Partner.findOne({ uuid: stripUUID(uuid) });
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    if(name !== undefined && partner.name !== name) {
        partner.name = name.trim();
        partner.markModified('name');
    }
    if(type !== undefined && partner.type !== type && session.player?.hasPermission(Permission.ManagePartners)) { // TODO: type should not be changeable by partner
        partner.type = type;
        partner.markModified('type');
    }
    if(redirect_url !== undefined && partner.redirect_url !== redirect_url) {
        partner.redirect_url = redirect_url;
        partner.markModified('redirect_url');
    }
    if(discord_id !== undefined && partner.discord_id !== discord_id) {
        partner.discord_id = discord_id;
        partner.markModified('discord_id');
    }
    if(icon_type !== undefined && partner.icon_type !== icon_type) {
        if(icon_type === PartnerIconType.Custom && !(await partnerIconFile(partner.uuid).exists())) return status(422, { error: i18n('$.partners.icon.custom_not_found') });
        partner.icon_type = icon_type;
        partner.markModified('icon_type');
    }
    if(partner.isModified()) {
        partner.save();
        // TODO: notification
    }

    return {
        uuid: formatUUID(partner.uuid),
        name: partner.name,
        type: partner.type,
        redirect_url: partner.redirect_url,
        icon_url: partner.getIconUrl(),
        joined_at: partner.joined_at.getTime()
    };
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Edit an existing partner'
    },
    response: {
        200: tSchema.Partner,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        422: tResponseBody.Error,
    },
    body: tRequestBody.EditPartner,
    params: t.Object({ uuid: t.String({ description: 'The partner UUID' }) }),
    headers: tHeaders
}).delete('/', async ({ session, params: { uuid }, i18n, status }) => {
    if(!session?.player?.hasPermission(Permission.ManagePartners)) return status(403, { error: i18n('$.error.notAllowed') });

    const partner = await Partner.findOne({ uuid: stripUUID(uuid) });
    if(!partner) return status(404, { error: i18n('$.partners.not_found') });

    await partner.deleteOne();

    return { message: i18n('$.partners.delete.success').replace('<username>', (await GameProfile.getProfileByUUID(uuid)).username || 'Unknown') };
}, {
    detail: {
        tags: [DocumentationCategory.Partners],
        description: 'Delete a specific partner'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: t.Object({ uuid: t.String({ description: 'The partner UUID' }) }),
    headers: tHeaders
});