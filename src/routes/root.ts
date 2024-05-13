import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import Logger from "../libs/Logger";
import { sendMessage, NotificationType } from "../libs/DiscordNotifier";
import { validJWTSession } from "../libs/SessionValidator";
import * as config from "../../config.json";
import fetchI18n from "../middleware/FetchI18n";

const colorCodeRegex = /(&|§)[0-9A-FK-ORX]/gi;

export default new Elysia()
.use(fetchI18n).get(`/`, async ({ error, params, headers, i18n }) => { // Get player info
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(config.requireSessionIds && !authenticated) return error(401, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNoTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`getInfo.banned`) });

    return {
        uuid: player.uuid,
        tag: player.tag || null,
        position: player.position,
        icon: player.icon,
        admin: player.admin
    };
}, {
    detail: {
        tags: ['Interactions'],
        description: `Get another players' tag info`
    },
    response: {
        200: t.Object({ uuid: t.String(), tag: t.Union([t.String(), t.Null()]), position: t.String(), icon: t.String(), admin: t.Boolean({ default: false }) }, { description: `You received the tag data.` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `The player is banned.` }),
        404: t.Object({ error: t.String() }, { description: `The player is not in the database.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The uuid of the player you want to fetch the info of` }) }),
    headers: t.Object({ authorization: config.requireSessionIds ? t.String({ error: `You're not authorized!`, description: `Your LabyConnect JWT` }) : t.Optional(t.String({ description: `Your LabyConnect JWT` })) }, { error: `You're not authorized!` }),
}).post(`/`, async ({ error, params, headers, body, i18n }) => { // Change tag
    const uuid = params.uuid.replaceAll(`-`, ``);
    const tag = body.tag;
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(!authenticated) return error(401, { error: i18n(`error.notAllowed`) });
    
    const player = await players.findOne({ uuid });
    if(player && player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    const { blacklist, watchlist } = config.validation.tag;
    if(tag.trim() == '') return error(422, { error: i18n(`setTag.empty`) });
    const blacklistedWord = blacklist.find((word) => tag.replace(colorCodeRegex, ``).toLowerCase().includes(word));
    if(blacklistedWord) return error(422, { error: i18n(`setTag.blacklisted`).replaceAll(`<word>`, blacklistedWord) });
    const isWatched = (player && player.watchlist) || watchlist.some((word) => {
        if(tag.replace(colorCodeRegex, ``).toLowerCase().includes(word)) {
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

    if(isWatched) sendMessage({ type: NotificationType.WatchlistTagUpdate, uuid, tag });
    return { message: i18n(`setTag.success`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        400: t.Object({ error: t.String() }, { description: `You already have this tag.` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    body: t.Object({ tag: t.String({ minLength: config.validation.tag.min, maxLength: config.validation.tag.max, error: `The tag has to be between ${config.validation.tag.min} and ${config.validation.tag.max} characters.` }) }, { error: `Missing field "tag".` }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!`, description: `Your LabyConnect JWT` }) }, { error: `You're not authorized!` })
}).delete(`/`, async ({ error, params, headers, i18n }) => { // Delete tag
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(!authenticated) return error(401, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(!player.tag) return error(404, { error: i18n(`error.noTag`) });

    player.tag = null;
    await player.save();

    return { message: i18n(`resetTag.success`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Delete your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!`, description: `Your LabyConnect JWT` }) }, { error: `You're not authorized!` })
});