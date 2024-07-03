import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import Logger from "../libs/Logger";
import { sendMessage, NotificationType, ModLogType } from "../libs/DiscordNotifier";
import { getJWTSession } from "../libs/SessionValidator";
import * as config from "../../config.json";
import fetchI18n from "../middleware/FetchI18n";
import { stripColors } from "../libs/ChatColor";

export default new Elysia()
.use(fetchI18n).get(`/`, async ({ error, params, headers, i18n }) => { // Get player info
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(config.requireSessionIds && !session.uuid) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNoTag`) });

    return {
        uuid: player.uuid,
        tag: player.isBanned() ? null : player.tag || null,
        position: player.position || "ABOVE",
        icon: player.icon || "NONE",
        admin: player.admin,
        ban: session.equal || session.isAdmin ? {
            active: player.isBanned(),
            reason: player.ban?.reason || null,
            appealable: player.ban!.appealable
        } : null
    };
}, {
    detail: {
        tags: ['Interactions'],
        description: `Get another players' tag info`
    },
    response: {
        200: t.Object({ uuid: t.String(), tag: t.Union([t.String(), t.Null()]), position: t.String(), icon: t.String(), admin: t.Boolean({ default: false }), ban: t.Union([t.Object({ active: t.Boolean(), reason: t.Union([t.String(), t.Null()]) }), t.Null()]) }, { description: `You received the tag data.` }),
        403: t.Object({ error: t.String() }, { description: `The player is banned.` }),
        404: t.Object({ error: t.String() }, { description: `The player is not in the database.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The uuid of the player you want to fetch the info of` }) }),
    headers: t.Object({ authorization: config.requireSessionIds ? t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) : t.Optional(t.String({ description: `Your LabyConnect JWT` })) }, { error: `error.notAllowed` }),
}).post(`/`, async ({ error, params, headers, body, i18n }) => { // Change tag
    const uuid = params.uuid.replaceAll(`-`, ``);
    const tag = body.tag.trim();
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.equal && !session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });
    
    const player = await players.findOne({ uuid });
    if(player && player.isBanned()) return error(403, { error: i18n(`error.${session.equal ? 'b' : 'playerB'}anned`) });
    const { min, max, blacklist, watchlist } = config.validation.tag;
    const strippedTag = stripColors(tag).trim();
    if(strippedTag == '') return error(422, { error: i18n(`setTag.empty`) });
    if(strippedTag.length < min || strippedTag.length > max) return error(422, { error: i18n(`setTag.validation`).replace('<min>', String(min)).replace('<max>', String(max)) });
    const blacklistedWord = blacklist.find((word) => strippedTag.toLowerCase().includes(word));
    if(blacklistedWord) return error(422, { error: i18n(`setTag.blacklisted`).replaceAll(`<word>`, blacklistedWord) });
    const isWatched = (player && player.watchlist) || watchlist.some((word) => {
        if(strippedTag.toLowerCase().includes(word)) {
            Logger.warn(`Now watching ${uuid} for matching "${word}" in "${tag}".`);
            sendMessage({ type: NotificationType.WatchlistAdd, uuid, tag, word });
            return true;
        }
        return false;
    });

    if(!player) {
        await new players({
            uuid,
            tag,
            watchlist: isWatched,
            history: [tag]
        }).save();
    } else {
        if(player.tag == tag) return error(400, { error: i18n(`setTag.sameTag`) });

        player.tag = tag;
        if(isWatched) player.watchlist = true;
        if(player.history[player.history.length - 1] != tag) player.history.push(tag);
        await player.save();
    }
    
    if(!session.equal) {
        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.ChangeTag,
            uuid: uuid,
            staff: session.uuid || 'Unknown',
            oldTag: player?.tag || 'None',
            newTag: tag
        });
    }

    if(isWatched) sendMessage({ type: NotificationType.WatchlistTagUpdate, uuid, tag });
    return { message: i18n(`setTag.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        400: t.Object({ error: t.String() }, { description: `You already have this tag.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    body: t.Object({ tag: t.String({ error: `error.wrongType;;[["field", "tag"], ["type", "string"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/admin`, async ({ error, params, headers, i18n }) => { // Toggle admin
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });

    player.admin = !player.admin;
    await player.save();
    if(!session.equal) {
        sendMessage({
            type: NotificationType.ModLog,
            logType: player.admin ? ModLogType.MakeAdmin : ModLogType.RemoveAdmin,
            uuid: uuid,
            staff: session.uuid || 'Unknown'
        });
    }

    return { message: i18n(`toggleAdmin.${player.admin ? 'on' : 'off'}`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Toggle the admin status of a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player's admin status has changed.` }),
        400: t.Object({ error: t.String() }, { description: `You already have this tag.` }),
        403: t.Object({ error: t.String() }, { description: `You're not an admin.` }),
        404: t.Object({ error: t.String() }, { description: `The player was not found.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The player's UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/watch`, async ({ error, params, headers, i18n }) => { // Watch player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(player.watchlist) return error(400, { error: i18n(`watch.alreadyWatched`) });

    player.watchlist = true;
    await player.save();
    
    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.Watch,
        uuid: uuid,
        staff: session.uuid || 'Unknown'
    });

    return { message: i18n(`watch.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Watch a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player is on the watchlist now.` }),
        400: t.Object({ error: t.String() }, { description: `The player is already on the watchlist.` }),
        403: t.Object({ error: t.String() }, { description: `You're not an admin.` }),
        404: t.Object({ error: t.String() }, { description: `The player was not found.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The player's UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/unwatch`, async ({ error, params, headers, i18n }) => { // Unwatch player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });
    
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.watchlist) return error(400, { error: i18n(`unwatch.notWatched`) });

    player.watchlist = false;
    await player.save();
    
    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.Unwatch,
        uuid: uuid,
        staff: session.uuid || 'Unknown'
    });

    return { message: i18n(`unwatch.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Unwatch a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player is no longer on the watchlist.` }),
        400: t.Object({ error: t.String() }, { description: `The player is not on the watchlist.` }),
        403: t.Object({ error: t.String() }, { description: `You're not an admin.` }),
        404: t.Object({ error: t.String() }, { description: `The player was not found.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The player's UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/`, async ({ error, params, headers, i18n }) => { // Delete tag
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.equal && !session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.${session.equal ? 'b' : 'playerB'}anned`) });
    if(!player.tag) return error(404, { error: i18n(`error.noTag`) });

    player.tag = null;
    await player.save();
    if(!session.equal) {
        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.ClearTag,
            uuid: uuid,
            staff: session.uuid || 'Unknown'
        });
    }

    return { message: i18n(`resetTag.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Delete your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});
