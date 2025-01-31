import { t } from "elysia";
import players from "../../../database/schemas/players";
import { join } from "path";
import { capitalCase, snakeCase } from "change-case";
import { config } from "../../../libs/config";
import { Permission } from "../../../types/Permission";
import { GlobalIcon } from "../../../types/GlobalIcon";
import { getProfileByUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendTagChangeEmail } from "../../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";

export function getCustomIconUrl(uuid: string, hash: string) {
    return `${config.baseUrl}/players/${uuid}/icon/${hash}`;
}

export default (app: ElysiaApp) => app.get('/:hash', async ({ params: { uuid, hash }, i18n, error }) => { // Get custom icon
    const player = await players.findOne({ uuid: stripUUID(uuid) });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(player.isBanned()) return error(403, { error: i18n('error.playerBanned') });

    const file = Bun.file(join('icons', player.uuid, `${hash.trim()}.png`));
    if(!(await file.exists())) return error(404, { error: i18n('error.noIcon') });

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
}).post('/', async ({ session, body: { icon }, params, i18n, error }) => { // Change icon
    if(!session || !session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n('error.notAllowed') });

    icon = snakeCase(icon);
    const uuid = stripUUID(params.uuid);
    const player = await players.findOne({ uuid });
    if(session.equal && player?.isBanned()) return error(403, { error: i18n('error.banned') });

    const isCustomIconDisallowed = snakeCase(GlobalIcon[GlobalIcon.Custom]) == icon && !session.hasPermission(Permission.CustomIcon);
    if(!session.hasPermission(Permission.BypassValidation) && (isCustomIconDisallowed || !(capitalCase(icon) in GlobalIcon) || config.validation.icon.blacklist.includes(capitalCase(icon)))) return error(403, { error: i18n('icon.notAllowed') });

    const oldIcon = player?.icon;

    if(player) {
        if(player.isBanned()) return error(403, { error: i18n('error.banned') });
        if(snakeCase(player.icon.name) == icon) return error(400, { error: i18n('icon.sameIcon') });

        player.icon.name = icon;
        await player.save();
    } else {
        await players.insertMany({
            uuid,
            icon
        });
    }
    
    if(!session.equal) {
        sendModLogMessage({
            logType: ModLogType.ChangeIconType,
            staff: await getProfileByUUID(session.uuid!),
            user: await getProfileByUUID(uuid),
            discord: false,
            icons: {
                old: oldIcon?.name || '---',
                new: icon
            }
        });

        if(player?.isEmailVerified()) {
            sendTagChangeEmail(player.connections.email.address!, oldIcon?.name || '---', icon, getI18nFunctionByLanguage(player.last_language));
        }
    }

    return { message: i18n(`icon.success.${session.equal ? 'self' : 'admin'}`) };
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
    body: t.Object({ icon: t.String({ error: 'error.wrongType;;[["field", "icon"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/role', async ({ session, body: { hidden }, params, i18n, error }) => { // Toggle role icon
    if(!session || !session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(session.equal && player.isBanned()) return error(403, { error: i18n('error.banned') });

    player.hide_role_icon = hidden;
    await player.save();

    return { message: i18n(`icon.role_icon.success.${player.hide_role_icon ? 'hidden' : 'shown'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Toggles the visibility of your role icon'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The role icon was toggled' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to toggle your role icon' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ hidden: t.Boolean({ error: 'error.wrongType;;[["field", "hidden"], ["type", "boolean"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});