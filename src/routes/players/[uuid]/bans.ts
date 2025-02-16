import { t } from "elysia";
import players from "../../../database/schemas/players";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { ModLogType, sendBanAppealMessage, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendBanEmail, sendUnbanEmail } from "../../../libs/mailer";
import { Permission } from "../../../types/Permission";
import { formatUUID, GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, error }) => { // Get ban list
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });

    return player.bans.map((ban) => ({
        appealable: ban.appealable,
        appealed: ban.appealed,
        banned_at: ban.banned_at.getTime(),
        expires_at: ban.expires_at?.getTime() || null,
        id: ban.id,
        reason: ban.reason,
        staff: formatUUID(ban.staff)
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns all player bans'
    },
    response: {
        200: t.Array(t.Object({ appealable: t.Boolean(), appealed: t.Boolean(), banned_at: t.Number(), expires_at: t.Union([t.Number(), t.Null()]), id: t.String(), reason: t.String({ default: '…' }), staff: t.String({ default: '00000000-0000-0000-0000-000000000000' }) }), { description: 'A list of bans' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).get('/:id', async ({ session, params, i18n, error }) => { // Get ban info of specific ban
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    
    const ban = player.bans.find(({ id }) => id === params.id);
    if(!ban) return error(404, { error: i18n('ban.not_found') });
    const { appealable, appealed, banned_at, expires_at, id, reason, staff } = ban;

    return { appealable, appealed, banned_at: banned_at.getTime(), expires_at: expires_at?.getTime() || null, id, reason, staff: formatUUID(staff) };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns info about a specific player ban'
    },
    response: {
        200: t.Object({ appealable: t.Boolean(), appealed: t.Boolean(), banned_at: t.Number(), expires_at: t.Union([t.Number(), t.Null()]), id: t.String(), reason: t.String({ default: '…' }), staff: t.String({ default: '00000000-0000-0000-0000-000000000000' }) }, { description: 'The ban object' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans' }),
        404: t.Object({ error: t.String() }, { description: 'The player or ban was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The ban ID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/', async ({ session, body: { reason, appealable, duration }, params, i18n, error }) => { // Ban player
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(player.isBanned()) return error(409, { error: i18n('ban.already_banned') });

    const expires = duration ? new Date(Date.now() + duration) : null;
    player.banPlayer({ reason, staff: session.uuid!, appealable, expiresAt: expires });
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Ban,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await GameProfile.getProfileByUUID(uuid),
        discord: false,
        reason: reason,
        appealable: appealable == undefined ? true : appealable,
        expires
    });

    if(player.isEmailVerified()) {
        sendBanEmail(player.connections.email.address!, reason || '---', getI18nFunctionByLanguage(player.last_language));
    }

    return { message: i18n('ban.banned') };
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
    body: t.Object({ appealable: t.Optional(t.Boolean({ error: 'error.wrongType;;[["field", "appealable"], ["type", "boolean"]]' })), duration: t.Optional(t.Number({ error: 'error.wrongType;;[["field", "duration"], ["type", "number"]]' })), reason: t.String({ error: 'error.wrongType;;[["field", "reason"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).patch('/', async ({ session, body: { appealable, reason }, params, i18n, error }) => { // Update ban info
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(!player.isBanned()) return error(409, { error: i18n('ban.not_banned') });

    const ban = player.bans.at(0)!;
    ban.reason = reason;
    ban.appealable = appealable;
    await player.save();

    sendModLogMessage({
        logType: ModLogType.EditBan,
        user: await GameProfile.getProfileByUUID(uuid),
        staff: await GameProfile.getProfileByUUID(session.uuid!),
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
    body: t.Object({ appealable: t.Boolean({ error: 'error.wrongType;;[["field", "appealable"], ["type", "boolean"]]' }), reason: t.String({ error: 'error.wrongType;;[["field", "reason"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/appeal', async ({ session, body: { reason }, params, i18n, error }) => { // Appeal ban
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player || !player.isBanned()) return error(404, { error: i18n('appeal.notBanned') });
    const ban = player.bans.at(0)!;
    if(!ban.appealable) return error(403, { error: i18n('appeal.notAppealable') });
    if(ban.appealed) return error(403, { error: i18n('appeal.alreadyAppealed') });

    ban.appealed = true;
    await player.save();

    sendBanAppealMessage(
        await GameProfile.getProfileByUUID(uuid),
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
    body: t.Object({ reason: t.String({ error: 'error.wrongType;;[["field", "reason"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/', async ({ session, params, i18n, error }) => { // Unban player
    if(!session?.hasPermission(Permission.ManageBans)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(!player.isBanned()) return error(409, { error: i18n('ban.not_banned') });

    player.unban();
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Unban,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await GameProfile.getProfileByUUID(uuid),
        discord: false
    });

    if(player.isEmailVerified()) {
        sendUnbanEmail(player.connections.email.address!, getI18nFunctionByLanguage(player.last_language));
    }

    return { message: i18n('ban.unbanned') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Unbans a player'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was unbanned' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage bans' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'The player is not banned' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});