import { t } from "elysia";
import players from "../../../database/schemas/players";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { ModLogType, sendBanAppealMessage, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendBanEmail, sendUnbanEmail } from "../../../libs/mailer";
import { Permission } from "../../../types/Permission";
import { getProfileByUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, error }) => { // Get ban info
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });

    return { banned: player.isBanned(), reason: player.isBanned() ? player.ban.reason || null : null, appealable: player.ban.appealable };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns info about a player ban'
    },
    response: {
        200: t.Object({ banned: t.Boolean(), reason: t.Union([t.String(), t.Null()], { default: '…' }), appealable: t.Boolean() }, { description: 'The ban object' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans' }),
        404: t.Object({ error: t.String() }, { description: "The player you searched for was not found." }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/', async ({ session, body: { reason }, params, i18n, error }) => { // Ban player
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(player.isBanned()) return error(409, { error: i18n('ban.alreadyBanned') });

    player.banPlayer(reason, session.uuid!);
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Ban,
        staff: await getProfileByUUID(session.uuid!),
        user: await getProfileByUUID(uuid),
        discord: false,
        reason: reason
    });

    if(player.isEmailVerified()) {
        sendBanEmail(player.connections.email.address!, reason || '---', getI18nFunctionByLanguage(player.last_language));
    }

    return { message: i18n('ban.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Bans a player'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was banned' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'The player is already banned' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ reason: t.String() }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).put('/', async ({ session, body: { reason, appealable }, params, i18n, error }) => { // Update ban info - I need to use put here bc labymod's Request system doesn't support PATCH
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(!player.isBanned()) return error(409, { error: i18n('unban.notBanned') });

    player.ban.reason = reason;
    player.ban.appealable = appealable;
    await player.save();

    sendModLogMessage({
        logType: ModLogType.EditBan,
        user: await getProfileByUUID(uuid),
        staff: await getProfileByUUID(session.uuid!),
        discord: false,
        appealable: appealable,
        reason
    });

    return { message: i18n('editBan.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Edits the ban info of a player'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The ban info was edited' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'The player is not banned' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ reason: t.Optional(t.String()), appealable: t.Boolean({ error: 'error.wrongType;;[["field", "appealable"], ["type", "boolean"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/appeal', async ({ session, body: { reason }, params, i18n, error }) => { // Ban player
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player || !player.isBanned()) return error(404, { error: i18n('appeal.notBanned') });
    if(!player.ban.appealable) return error(403, { error: i18n('appeal.notAppealable') });
    if(player.ban.appealed) return error(403, { error: i18n('appeal.alreadyAppealed') });

    player.ban.appealed = true;
    await player.save();

    sendBanAppealMessage(
        await getProfileByUUID(uuid),
        reason
    );

    return { message: i18n('appeal.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Requests to be unbanned by the admins'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your appeal was sent' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to send an appeal' }),
        404: t.Object({ error: t.String() }, { description: 'You\'re not banned' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ reason: t.String() }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/', async ({ session, params, i18n, error }) => { // Unban player
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(!player.isBanned()) return error(409, { error: i18n('unban.notBanned') });

    player.unban();
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Unban,
        staff: await getProfileByUUID(session.uuid!),
        user: await getProfileByUUID(uuid),
        discord: false
    });

    if(player.isEmailVerified()) {
        sendUnbanEmail(player.connections.email.address!, getI18nFunctionByLanguage(player.last_language));
    }

    return { message: i18n('unban.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Unbans a player'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was unbanned' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans.' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'The player is not banned' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});