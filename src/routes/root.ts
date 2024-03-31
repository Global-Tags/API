import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import Logger from "../libs/Logger";
import { sendMessage, NotificationType } from "../libs/DiscordNotifier";
import { validJWTSession } from "../libs/SessionValidator";
import * as config from "../../config.json";

const colorCodeRegex = /(&|§)[0-9A-FK-ORX]/gi;

export default new Elysia()
.get(`/`, async ({ error, params, headers }) => { // Get player info
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(config.requireSessionIds && !authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `This player does not have a tag!` });
    if(player.isBanned()) return error(403, { error: `This player is banned!` });

    return {
        uuid: player.uuid,
        tag: player.tag,
        position: player.position,
        icon: player.icon,
        admin: player.admin
    };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: config.requireSessionIds ? t.String() : t.Optional(t.String()) })
}).post(`/`, async ({ error, params, headers, body }) => { // Change tag
    const uuid = params.uuid.replaceAll(`-`, ``);
    const tag = body.tag;
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: `You need a premium account to set a global tag!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });
    
    const player = await players.findOne({ uuid });
    if(player && player.isBanned()) return error(403, { error: `You are banned from changing your tag!` });
    const { blacklist, watchlist, min, max } = config.validation.tag;
    if(!tag || tag.length <= min || tag.length > max) return error(400, { error: `The tag has to be between ${min} and ${max} characters.` });
    if(tag.trim() == '') return error(400, { error: `The tag must not be empty!` });
    if(blacklist.some((word) => {
        if(tag.replace(colorCodeRegex, ``).toLowerCase().includes(word)) {
            error(400, { error: `You're not allowed to include "${word}" in your Global Tag!` });
            return true;
        } else return false;
    })) return;
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
        if(player.tag == tag) return error(400, { error: `You already have this tag!` });

        player.tag = tag;
        if(isWatched) player.watchlist = true;
        if(player.history[player.history.length - 1] != tag) player.history.push(tag);
        await player.save();
    }

    if(isWatched) sendMessage({ type: NotificationType.WatchlistTagUpdate, uuid, tag });
    return { message: `Your tag was successfully updated!` };
}, {
    params: t.Object({ uuid: t.String() }),
    body: t.Object({ tag: t.String() }),
    headers: t.Object({ authorization: t.String() })
}).delete(`/`, async ({ error, params, headers }) => { // Delete tag
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `You don't have a tag!` });
    if(player.isBanned()) return error(403, { error: `You are banned!` });
    if(!player.tag) return error(404, { error: `You don't have a tag!` });

    player.tag = null;
    await player.save();

    return { message: `Your tag was successfully reset!` };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String() })
});