import { t } from "elysia";
import { config } from "../../../libs/config";
import { Permission } from "../../../types/Permission";
import { GlobalIcon, icons } from "../../../types/GlobalIcon";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { sendCustomIconUploadMessage } from "../../../libs/discord-notifier";
import sharp from "sharp";
import Logger from "../../../libs/Logger";
import { generateSecureCode } from "../../../libs/crypto";
import { Player } from "../../../libs/database/schemas/Player";
import { tResponseBody, tHeaders, tParams, tRequestBody } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { customIconFile, customIconPath } from "../../../libs/data-accessor";
import { readdirSync } from "fs";

export function getCustomIconUrl(uuid: string, hash: string) {
    return `${config.baseUrl}/players/${uuid}/icon/${hash}`;
}

export default (app: ElysiaApp) => app.get('/', async ({ session, params: { uuid }, i18n, status }) => { // Get all custom icons of a player
    if(!session || !session.self && !session?.player?.hasPermission(Permission.ViewPlayerCustomIcons)) return status(403, { error: i18n('$.error.notAllowed') });
    const player = await Player.findOne({ uuid: stripUUID(uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return readdirSync(customIconPath(player.uuid)).filter(file => file.endsWith('.png')).map(file => file.replace('.png', ''));
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Get all custom icons of a player'
    },
    response: {
        200: tResponseBody.IconList,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.uuid
}).get('/:hash', async ({ params: { uuid, hash }, i18n, status }) => { // Get custom icon
    const player = await Player.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.noTag') });
    if(player.isBanned()) return status(403, { error: i18n('$.error.playerBanned') });

    const file = customIconFile(player.uuid, hash);
    if(!(await file.exists())) return status(404, { error: i18n('$.error.noIcon') });

    return file as File;
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Get a custom icon'
    },
    response: {
        200: t.File({ description: 'An image file' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.uuidAndIconHash
}).post('/', async ({ session, body: { image }, params, i18n, status }) => { // Upload custom icon
    if(!session || !session.self) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.noTag') });
    if(player.isBanned()) return status(403, { error: i18n('$.error.banned') });
    if(!player.hasPermission(Permission.CustomIcon)) return status(403, { error: i18n('$.icon.upload.notAllowed') });

    const metadata = await sharp(await image.arrayBuffer()).metadata().catch((err: Error) => {
        Logger.error('Failed to read image metadata:', err.message);
        return null;
    });

    if(!metadata) return status(422, { error: i18n('$.icon.upload.invalidMetadata') });
    if(metadata.format != 'png') return status(422, { error: i18n('$.icon.upload.wrongFormat')});
    if(!metadata.height || metadata.height != metadata.width) return status(422, { error: i18n('$.icon.upload.wrongResolution')});
    if(metadata.height > config.validation.icon.maxResolution) return status(422, { error: i18n('$.icon.upload.exceedsMaxResolution').replaceAll('<max>', config.validation.icon.maxResolution.toString()) });

    player.icon.type = GlobalIcon.Custom;
    player.icon.hash = generateSecureCode(32);
    player.markModified('icon');
    await player.save();
    await Bun.write(customIconFile(player.uuid, player.icon.hash), await image.arrayBuffer(), { createPath: true });

    if(!player.hasPermission(Permission.BypassValidation)) sendCustomIconUploadMessage(
        await player.getGameProfile(),
        player.icon.hash
    );

    return { message: i18n('$.icon.upload.success'), hash: player.icon.hash };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Upload a custom icon'
    },
    response: {
        200: t.Object({ message: t.String(), hash: t.String() }, { description: 'A message and icon hash' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.UploadCustomIcon,
    params: tParams.uuid,
    headers: tHeaders
}).delete('/:hash', async ({ session, params: { uuid, hash }, i18n, status }) => { // Delete custom icon
    if(!session?.selfOrHasPermission(Permission.DeletePlayerCustomIcons)) return status(403, { error: i18n('$.error.notAllowed') });
    const player = await Player.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const file = customIconFile(player.uuid, hash);
    if(!(await file.exists())) return status(404, { error: i18n('$.icons.unknown_custom_icon') });

    await file.delete();
    if(player.icon.hash === hash) {
        player.clearIconTexture('Manual deletion of icon file', player.uuid);
        await player.save();
    }

    return { message: i18n('$.icon.delete.success') };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Delete a custom icon file'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.uuidAndIconHash,
    headers: tHeaders
});