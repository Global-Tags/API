import { t } from "elysia";
import { ElysiaApp } from "../../..";
import players from "../../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { getProfileByUUID, stripUUID } from "../../../libs/game-profiles";
import { Permission } from "../../../types/Permission";

export default (app: ElysiaApp) => app.post('/watch', async ({ session, params, i18n, error }) => { // Watch player
    if(!session?.hasPermission(Permission.ManageWatchlist)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(player.watchlist) return error(409, { error: i18n('watch.alreadyWatched') });

    player.watchlist = true;
    await player.save();
    
    sendModLogMessage({
        logType: ModLogType.Watch,
        staff: await getProfileByUUID(session.uuid!),
        user: await getProfileByUUID(uuid),
        discord: false
    });

    return { message: i18n('watch.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Adds a player to the watchlist'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player is now on the watchlist' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage the watchlist' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'The player is already on the watchlist' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/unwatch', async ({ session, params, i18n, error }) => { // Unwatch player
    if(!session?.hasPermission(Permission.ManageWatchlist)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });
    if(!player.watchlist) return error(409, { error: i18n('unwatch.notWatched') });

    player.watchlist = false;
    await player.save();
    
    sendModLogMessage({
        logType: ModLogType.Unwatch,
        staff: await getProfileByUUID(session.uuid!),
        user: await getProfileByUUID(uuid),
        discord: false
    });

    return { message: i18n('unwatch.success') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Removes a player from the watchlist'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player is no longer on the watchlist' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage the watchlist' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'The player is not on the watchlist' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});