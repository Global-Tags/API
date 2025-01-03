import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import Logger from "../libs/Logger";
import { sendMessage, NotificationType, ModLogType } from "../libs/DiscordNotifier";
import fetchI18n, { getI18nFunctionByLanguage } from "../middleware/FetchI18n";
import { stripColors } from "../libs/ChatColor";
import getAuthProvider from "../middleware/GetAuthProvider";
import { snakeCase } from "change-case";
import { sendTagChangeEmail, sendTagClearEmail } from "../libs/Mailer";
import { saveLastLanguage } from "../libs/I18n";
import { config } from "../libs/Config";
import { getRole, Permission } from "../libs/RoleManager";
import GlobalIcon from "../types/GlobalIcon";
import GlobalPosition from "../types/GlobalPosition";

const { validation } = config;
const { min, max, blacklist, watchlist } = validation.tag;

export default new Elysia()
.use(fetchI18n).use(getAuthProvider).get(`/`, async ({ error, params, headers, i18n, provider, language }) => { // Get player info
    const uuid = params.uuid.replaceAll(`-`, ``);
    let showBan = false;
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!!session.uuid && !!language) saveLastLanguage(session.uuid, language);
    if(config.strictAuth) {
        if(!session.uuid) return error(403, { error: i18n(`error.notAllowed`) });
        showBan = session.equal || session.hasPermission(Permission.ManageBans);
    }

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNoTag`) });

    if(snakeCase(player.icon.name) == snakeCase(GlobalIcon[GlobalIcon.Custom])) {
        if(!(await player.hasPermission(Permission.CustomIcon))) {
            player.icon.name = snakeCase(GlobalIcon[GlobalIcon.None]);
            await player.save();
        }
    }

    return {
        uuid: formatUUID(player.uuid),
        tag: player.isBanned() ? null : player.tag || null,
        position: snakeCase(player.position || GlobalPosition[GlobalPosition.Above]),
        icon: {
            type: snakeCase(player.icon.name || GlobalIcon[GlobalIcon.None]),
            hash: player.icon.hash || null
        },
        roleIcon: !player.hide_role_icon ? player.getRolesSync().find((role) => getRole(role)?.hasIcon) || null : null,
        roles: player.getRolesSync().map((role) => snakeCase(role)),
        permissions: Object.keys(player.getPermissionsSync()).filter((perm) => player.getPermissionsSync()[perm]).map((permission) => snakeCase(permission)),
        referrals: {
            has_referred: player.referrals.has_referred,
            total_referrals: player.referrals.total.length,
            current_month_referrals: player.referrals.current_month
        },
        ban: showBan ? {
            active: player.isBanned(),
            reason: player.ban.reason || null,
            appealable: player.ban.appealable
        } : null
    };
}, {
    detail: {
        tags: ['Interactions'],
        description: `Get another players' tag info`
    },
    response: {
        200: t.Object({ uuid: t.String(), tag: t.Union([t.String(), t.Null()]), position: t.String(), icon: t.Object({ type: t.String(), hash: t.Union([t.String(), t.Null()]) }), referrals: t.Object({ has_referred: t.Boolean(), total_referrals: t.Integer(), current_month_referrals: t.Integer() }), roleIcon: t.Union([t.String(), t.Null()]), roles: t.Array(t.String()), permissions: t.Array(t.String()), ban: t.Union([t.Object({ active: t.Boolean(), reason: t.Union([t.String(), t.Null()]) }), t.Null()]) }, { description: `You received the tag data.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `The player is banned.` }),
        404: t.Object({ error: t.String() }, { description: `The player is not in the database.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The uuid of the player you want to fetch the info of` }) }),
    headers: t.Object({ authorization: config.strictAuth ? t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) : t.Optional(t.String({ description: `Your LabyConnect JWT` })) }, { error: `error.notAllowed` }),
}).get(`/history`, async ({ error, params, headers, i18n, provider }) => { // Get player's tag history
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNoTag`) });

    return player.history.map((tag) => ({
        tag,
        flaggedWords: watchlist.filter((entry) => stripColors(tag).trim().toLowerCase().includes(entry))
    }));
}, {
    detail: {
        tags: ['Interactions'],
        description: `Get another players' tag history`
    },
    response: {
        200: t.Array(t.Object({ tag: t.String(), flaggedWords: t.Array(t.String()) }), { description: `You received the tag history.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `The player is banned.` }),
        404: t.Object({ error: t.String() }, { description: `The player is not in the database.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The uuid of the player you want to fetch the info of` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` }),
}).post(`/`, async ({ error, params, headers, body, i18n, provider }) => { // Change tag
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const tag = body.tag.trim();
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n(`error.notAllowed`) });
    
    const player = await players.findOne({ uuid });
    if(player && player.isBanned()) return error(403, { error: i18n(`error.${session.equal ? 'b' : 'playerB'}anned`) });
    
    let isWatched = false;
    let notifyWatch = true;
    if(!session.hasPermission(Permission.BypassValidation)) {
        const strippedTag = stripColors(tag);
        if(strippedTag == '') return error(422, { error: i18n(`setTag.empty`) });
        if(strippedTag.length < min || strippedTag.length > max) return error(422, { error: i18n(`setTag.validation`).replace('<min>', String(min)).replace('<max>', String(max)) });
        const blacklistedWord = blacklist.find((word) => strippedTag.toLowerCase().includes(word));
        if(blacklistedWord) return error(422, { error: i18n(`setTag.blacklisted`).replaceAll(`<word>`, blacklistedWord) });
        isWatched = (player && player.watchlist) || watchlist.some((word) => {
            if(strippedTag.toLowerCase().includes(word)) {
                Logger.warn(`Now watching ${uuid} for matching "${word}" in "${tag}".`);
                sendMessage({ type: NotificationType.WatchlistAdd, uuid, tag, word });
                notifyWatch = false;
                return true;
            }
            return false;
        });
    }

    const oldTag = player?.tag;

    if(!player) {
        await players.insertMany({
            uuid,
            tag,
            watchlist: isWatched,
            history: [tag]
        });
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
            oldTag: oldTag || 'None',
            newTag: tag
        });

        if(player?.isEmailVerified()) {
            sendTagChangeEmail(player.connections.email.address!, oldTag || '---', tag, getI18nFunctionByLanguage(player.last_language));
        }
    }

    if(isWatched && notifyWatch) sendMessage({ type: NotificationType.WatchlistTagUpdate, uuid, tag });
    return { message: i18n(`setTag.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        400: t.Object({ error: t.String() }, { description: `You already have this tag.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    body: t.Object({ tag: t.String({ error: `error.wrongType;;[["field", "tag"], ["type", "string"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/watch`, async ({ error, params, headers, i18n, provider }) => { // Watch player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageWatchlist)) return error(403, { error: i18n(`error.notAllowed`) });
    
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
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're not an admin.` }),
        404: t.Object({ error: t.String() }, { description: `The player was not found.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The player's UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/unwatch`, async ({ error, params, headers, i18n, provider }) => { // Unwatch player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageWatchlist)) return error(403, { error: i18n(`error.notAllowed`) });
    
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
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're not an admin.` }),
        404: t.Object({ error: t.String() }, { description: `The player was not found.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `The player's UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/`, async ({ error, params, headers, i18n, provider }) => { // Delete tag
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.${session.equal ? 'b' : 'playerB'}anned`) });
    if(!player.tag) return error(404, { error: i18n(`error.noTag`) });
    const oldTag = player.tag;

    player.tag = null;
    if(!session.equal) {
        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.ClearTag,
            uuid: uuid,
            staff: session.uuid || 'Unknown'
        });
        player.clearTag(session.uuid!);
        sendTagClearEmail(player.connections.email.address!, oldTag, getI18nFunctionByLanguage(player.last_language));
    }
    await player.save();

    return { message: i18n(`resetTag.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Delete your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});

export function formatUUID(uuid: string): string {
    const cleanedUUID = uuid.replace(/-/g, "");
    
    if(cleanedUUID.length != 32) throw new Error("Invalid UUID length: Expected 32 characters without dashes.");
    
    return `${cleanedUUID.slice(0, 8)}-${cleanedUUID.slice(8, 12)}-${cleanedUUID.slice(12, 16)}-${cleanedUUID.slice(16, 20)}-${cleanedUUID.slice(20)}`;
}