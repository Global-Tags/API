import { t } from "elysia";
import { ElysiaApp } from "../../..";
import players from "../../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { GameProfile, stripUUID } from "../../../libs/game-profiles";
import { Permission } from "../../../types/Permission";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, error }) => { // Watch player
    if(!session?.hasPermission(Permission.ManageWatchlist)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });

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
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).patch('/', async ({ session, body: { watched }, params, i18n, error }) => { // Watch player
    if(!session?.hasPermission(Permission.ManageWatchlist)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(player.watchlist == watched) return error(409, { error: i18n(`watchlist.${player.watchlist ? 'already' : 'not'}_watched`) });

    player.watchlist = watched;
    await player.save();
    
    sendModLogMessage({
        logType: player.watchlist ? ModLogType.Watch : ModLogType.Unwatch,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await player.getGameProfile(),
        discord: false
    });

    return { message: i18n(`watchlist.success.${player.watchlist ? 'watch' : 'unwatch'}`) };
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
    body: t.Object({ watched: t.Boolean({ error: 'error.wrongType;;[["field", "watched"], ["type", "boolean"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});