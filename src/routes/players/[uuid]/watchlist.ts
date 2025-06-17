import { t } from "elysia";
import { ElysiaApp } from "../../..";
import players from "../../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { stripUUID } from "../../../libs/game-profiles";
import { Permission } from "../../../types/Permission";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Watch player
    if(!session?.player?.hasPermission(Permission.ManageWatchlistEntries)) return status(403, { error: i18n('$.error.notAllowed') });
    
    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return { watched: player.watchlist };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns the player\'s watchlist status'
    },
    response: {
        200: t.Object({ watched: t.Boolean() }, { description: 'The player\'s watchlist status' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage the watchlist' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).patch('/', async ({ session, body: { watched }, params, i18n, status }) => { // Watch player
    if(!session?.player?.hasPermission(Permission.ManageWatchlistEntries)) return status(403, { error: i18n('$.error.notAllowed') });
    
    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    if(player.watchlist == watched) return status(409, { error: i18n(player.watchlist ? '$.watchlist.already_watched' : '$.watchlist.not_watched') });

    player.watchlist = watched;
    await player.save();
    
    sendModLogMessage({
        logType: player.watchlist ? ModLogType.Watch : ModLogType.Unwatch,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false
    });

    return { message: i18n(player.watchlist ? `$.watchlist.success.watch` : '$.watchlist.success.unwatch') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Toggles the watchlist status of a player'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player\'s watchlist status was updated' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage the watchlist' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'This watchlist state is already set' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ watched: t.Boolean({ error: '$.error.wrongType;;[["field", "watched"], ["type", "boolean"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});