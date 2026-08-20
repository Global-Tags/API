import { t } from "elysia";
import { ElysiaApp } from "..";
import { Partner, PartnerIconType } from "../libs/database/schemas/Partner";
import { tHeaders, tRequestBody, tResponseBody, tSchema } from "../libs/models";
import { DocumentationCategory } from "../types/DocumentationCategory";
import { Permission } from "../types/Permission";
import { formatUUID, GameProfile, stripUUID, uuidRegex } from "../libs/game-profiles";
import { partnerIconFile } from "../libs/data-accessor";
import sharp from "sharp";
import Logger from "../libs/Logger";
import { config } from "../libs/config";

export default (app: ElysiaApp) => app.get('/', async () =>
    Promise.all((await Partner.find().sort({ joinedAt: 1 }).lean()).map(async partner => ({
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
}).get('/:uuid', async ({ params: { uuid }, i18n, status }) => {
    const partner = await Partner.findOne({ uuid: stripUUID(uuid) }).lean();
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
}).post('/', async ({ session, body: { uuid, name, type, redirect_url, icon_type }, i18n, status }) => {
    if(!session?.player?.hasPermission(Permission.ManagePartners)) return status(403, { error: i18n('$.error.notAllowed') });

    uuid = stripUUID(uuid.trim());

    if(!uuidRegex.test(uuid)) return status(400, { error: i18n('$.partners.invalid_uuid') });
    if(await Partner.exists({ uuid })) return status(409, { error: i18n('$.partners.already_exists') });

    const joinedAt = new Date();
    joinedAt.setHours(0, 0, 0, 0);

    if(icon_type === PartnerIconType.Custom) icon_type = PartnerIconType.Skull; // icon does not exist on first creation

    const newPartner = await Partner.insertOne({
        uuid: stripUUID(uuid.trim()),
        name: name.trim(),
        type: type,
        redirect_url: redirect_url,
        icon_type: icon_type,
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
}).patch('/:uuid', async ({ session, body: { name, type, redirect_url, discord_id, icon_type }, params: { uuid }, i18n, status }) => {
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
}).delete('/:uuid', async ({ session, params: { uuid }, i18n, status }) => {
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
}).group('/:uuid/icon', group =>
    group.get('/', async ({ params: { uuid }, i18n, status }) => {
        const partner = await Partner.findOne({ uuid: stripUUID(uuid) });
        if(!partner) return status(404, { error: i18n('$.partners.not_found') });

        const file = partnerIconFile(partner.uuid);
        if(!(await file.exists())) return status(404, { error: i18n('$.error.noIcon') });

        return file as File;
    }, {
        detail: {
            tags: [DocumentationCategory.Partners],
            description: 'Get the partner icon'
        },
        response: {
            200: t.File({ description: 'The partner icon file' }),
            404: tResponseBody.Error,
        },
        params: t.Object({ uuid: t.String({ description: 'The partner UUID' }) }),
        headers: tHeaders
    }).post('/', async ({ session, params, body: { image }, i18n, status }) => { // Set role icon
        if(!session?.selfOrHasPermission(Permission.ManagePartners)) return status(403, { error: i18n('$.error.notAllowed') });

        const partner = await Partner.findOne({ uuid: stripUUID(params.uuid) });
        if(!partner) return status(404, { error: i18n('$.partners.not_found') });

        const metadata = await sharp(await image.arrayBuffer()).metadata().catch((err: Error) => {
            Logger.error('Failed to read image metadata:', err.message);
            return null;
        });

        if(!metadata) return status(422, { error: i18n('$.partners.icon.upload.invalidMetadata') });
        if(metadata.format != 'png') return status(422, { error: i18n('$.partners.icon.upload.wrongFormat')});
        if(!metadata.height || metadata.height != metadata.width) return status(422, { error: i18n('$.partners.icon.upload.wrongResolution')});
        if(metadata.height > config.validation.icon.maxResolution) return status(422, { error: i18n('$.partners.icon.upload.exceedsMaxResolution').replaceAll('<max>', config.validation.icon.maxResolution.toString()) });

        await Bun.write(partnerIconFile(partner.uuid), await image.arrayBuffer(), { createPath: true });

        return { message: i18n('$.partners.icon.upload.success') };
    }, {
        detail: {
            tags: [DocumentationCategory.Partners],
            description: 'Set the partner icon',
        },
        response: {
            200: tResponseBody.Message,
            404: tResponseBody.Error,
            403: tResponseBody.Error,
            422: tResponseBody.Error
        },
        body: tRequestBody.UploadPartnerIcon,
        headers: tHeaders
    })
)