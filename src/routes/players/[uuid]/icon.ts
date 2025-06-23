import { t } from "elysia";
import { join } from "path";
import { config } from "../../../libs/config";
import { Permission } from "../../../types/Permission";
import { GlobalIcon, icons } from "../../../types/GlobalIcon";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { ModLogType, sendCustomIconUploadMessage, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendTagChangeEmail } from "../../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import sharp from "sharp";
import Logger from "../../../libs/Logger";
import { generateSecureCode } from "../../../libs/crypto";
import { getOrCreatePlayer, Player } from "../../../database/schemas/Player";

export function getCustomIconUrl(uuid: string, hash: string) {
    return `${config.baseUrl}/players/${uuid}/icon/${hash}`;
}

export default (app: ElysiaApp) => app.get('/:hash', async ({ params: { uuid, hash }, i18n, status }) => { // Get custom icon
    const player = await Player.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.noTag') });
    if(player.isBanned()) return status(403, { error: i18n('$.error.playerBanned') });

    const file = Bun.file(join('data', 'icons', player.uuid, `${hash.trim()}.png`));
    if(!(await file.exists())) return status(404, { error: i18n('$.error.noIcon') });

    return file;
}, {
    detail: {
        tags: ['Settings'],
        description: 'Returns a custom icon by its owner and its hash'
    },
    response: {
        200: t.File({ description: 'The custom icon' }),
        403: t.Object({ error: t.String() }, { description: 'The player is banned' }),
        404: t.Object({ error: t.String() }, { description: 'The icon was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The uuid of the image owner' }), hash: t.String({ description: 'The image hash' }) })
}).post('/', async ({ session, body: { icon }, params, i18n, status }) => { // Change icon
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerIcons)) return status(403, { error: i18n('error.notAllowed') });

    const globalIcon = icon.toLowerCase() as GlobalIcon;
    const player = await getOrCreatePlayer(params.uuid);
    if(session.self && player.isBanned()) return status(403, { error: i18n('$.error.banned') });

    const isCustomIconDisallowed = session.self && GlobalIcon.Custom == icon && !session.player?.hasPermission(Permission.CustomIcon);
    if(!session.player?.hasPermission(Permission.BypassValidation) && (isCustomIconDisallowed || !icons.includes(globalIcon) || config.validation.icon.blacklist.includes(icon))) return status(403, { error: i18n('$.icon.notAllowed') });

    if(player.isBanned()) return status(403, { error: i18n('$.error.banned') });
    if(player.icon.type == icon) return status(400, { error: i18n('$.icon.sameIcon') });

    const oldIcon = player.icon.type;
    player.icon.type = globalIcon;
    await player.save();
    
    if(!session.self && session.player) {
        sendModLogMessage({
            logType: ModLogType.ChangeIconType,
            staff: await session.player.getGameProfile(),
            user: await player.getGameProfile(),
            discord: false,
            icons: {
                old: oldIcon || '---',
                new: icon
            }
        });

        if(player.email.verified) {
            sendTagChangeEmail(player.email.address!, oldIcon || '---', icon, getI18nFunctionByLanguage(player.preferred_language));
        }
    }

    return { message: i18n(session.self ? `$.icon.success.self` : '$.icon.success.admin') };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Changes your GlobalTag icon'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The icon was updated' }),
        400: t.Object({ error: t.String() }, { description: 'You\'re already using that icon' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to change your icon' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ icon: t.String({ error: '$.error.wrongType;;[["field", "icon"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).post('/upload', async ({ session, body: { image }, params, i18n, status }) => { // Upload custom icon
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
    await player.save();
    await Bun.write(Bun.file(join('data', 'icons', player.uuid, `${player.icon.hash}.png`)), await image.arrayBuffer(), { createPath: true });

    if(!player.hasPermission(Permission.BypassValidation)) sendCustomIconUploadMessage(
        await player.getGameProfile(),
        player.icon.hash
    );

    return { message: i18n('$.icon.upload.success'), hash: player.icon.hash };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Upload a custom icon'
    },
    response: {
        200: t.Object({ message: t.String(), hash: t.String() }, { description: 'The icon was uploaded' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to change your icon' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ image: t.File({ type: 'image/png', error: '$.error.wrongType;;[["field", "image"], ["type", "png file"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});