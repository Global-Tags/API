import { t } from "elysia";
import players from "../../../database/schemas/players";
import Logger from "../../../libs/Logger";
import { ModLogType, sendModLogMessage, sendWatchlistAddMessage, sendWatchlistTagUpdateMessage } from "../../../libs/discord-notifier";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { stripColors } from "../../../libs/chat-color";
import { snakeCase } from "change-case";
import { sendTagChangeEmail, sendTagClearEmail } from "../../../libs/mailer";
import { saveLastLanguage } from "../../../libs/i18n";
import { config } from "../../../libs/config";
import { Permission, permissions } from "../../../types/Permission";
import { GlobalIcon } from "../../../types/GlobalIcon";
import { GlobalPosition } from "../../../types/GlobalPosition";
import { formatUUID, getProfileByUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";

const { validation } = config;
const { min, max, blacklist, watchlist } = validation.tag;

export default (app: ElysiaApp) => app.get('/', async ({ session, language, params, i18n, error }) => { // Get player info
    let showBan = false;
    if(!!session?.uuid && !!language) saveLastLanguage(session.uuid, language);
    if(config.strictAuth) {
        if(!session?.uuid) return error(403, { error: i18n('error.notAllowed') });
        showBan = session.equal || session.hasPermission(Permission.ManageBans);
    }

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.playerNoTag') });

    if(snakeCase(player.icon.name) == snakeCase(GlobalIcon[GlobalIcon.Custom])) {
        if(!player.hasPermission(Permission.CustomIcon)) {
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
        roleIcon: !player.hide_role_icon ? player.getRoles().find((role) => role.hasIcon)?.name || null : null,
        roles: player.getRoles().map((role) => role.name),
        permissions: permissions.filter((permission) => player.hasPermission(permission)).map((permission) => snakeCase(Permission[permission])),
        referrals: {
            has_referred: player.referrals.has_referred,
            total_referrals: player.referrals.total.length,
            current_month_referrals: player.referrals.current_month
        },
        ban: showBan ? {
            active: player.isBanned(),
            reason: player.bans.at(0)?.reason || null,
            appealable: player.bans.at(0)?.appealable || false
        } : null
    };
}, {
    detail: {
        tags: ['Interactions'],
        description: 'Returns a players\' tag info'
    },
    response: {
        200: t.Object({ uuid: t.String(), tag: t.Union([t.String(), t.Null()]), position: t.String(), icon: t.Object({ type: t.String(), hash: t.Union([t.String(), t.Null()]) }), referrals: t.Object({ has_referred: t.Boolean(), total_referrals: t.Integer(), current_month_referrals: t.Integer() }), roleIcon: t.Union([t.String(), t.Null()]), roles: t.Array(t.String()), permissions: t.Array(t.String()), ban: t.Union([t.Object({ active: t.Boolean(), reason: t.Union([t.String(), t.Null()]) }), t.Null()]) }, { description: 'The tag data' }),
        403: t.Object({ error: t.String() }, { description: 'The player is banned' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The uuid of the player you want to fetch the info of' }) }),
    headers: t.Object({ authorization: config.strictAuth ? t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) : t.Optional(t.String({ description: 'Your authentication token' })) }, { error: 'error.notAllowed' }),
}).get('/history', async ({ session, params, i18n, error }) => { // Get player's tag history
    if(!session || session?.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.playerNoTag') });

    return player.history.map((tag) => ({
        tag,
        flaggedWords: watchlist.filter((entry) => stripColors(tag).trim().toLowerCase().includes(entry))
    }));
}, {
    detail: {
        tags: ['Interactions'],
        description: 'Returns a players\' tag history'
    },
    response: {
        200: t.Array(t.Object({ tag: t.String(), flaggedWords: t.Array(t.String()) }), { description: 'The tag history' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage tags' }),
        404: t.Object({ error: t.String() }, { description: 'The player is not in the database' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The uuid of the player you want to fetch the info of' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' }),
}).post('/', async ({ session, body: { tag }, params, i18n, error }) => { // Change tag
    const uuid = stripUUID(params.uuid);
    if(!session || !session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid });
    if(session.equal && player?.isBanned()) return error(403, { error: i18n('error.banned') });

    let isWatched = false;
    let notifyWatch = true;
    if(!session.hasPermission(Permission.BypassValidation)) {
        const strippedTag = stripColors(tag);
        if(strippedTag == '') return error(422, { error: i18n('setTag.empty') });
        if(strippedTag.length < min || strippedTag.length > max) return error(422, { error: i18n('setTag.validation').replace('<min>', String(min)).replace('<max>', String(max)) });
        const blacklistedWord = blacklist.find((word) => strippedTag.toLowerCase().includes(word));
        if(blacklistedWord) return error(422, { error: i18n('setTag.blacklisted').replaceAll('<word>', blacklistedWord) });
        isWatched = (player && player.watchlist) || await (async () => {
            for(const word of watchlist) {
                if(strippedTag.toLowerCase().includes(word)) {
                    Logger.warn(`Now watching ${uuid} for matching "${word}" in "${tag}".`);
                    sendWatchlistAddMessage({ user: await getProfileByUUID(uuid), tag, word });
                    notifyWatch = false;
                    return true;
                }
            }
            return false;
        })();
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
        if(player.tag == tag) return error(409, { error: i18n('setTag.sameTag') });

        player.tag = tag;
        if(isWatched) player.watchlist = true;
        if(player.history[player.history.length - 1] != tag) player.history.push(tag);
        await player.save();
    }
    
    if(!session.equal) {
        sendModLogMessage({
            logType: ModLogType.ChangeTag,
            staff: await getProfileByUUID(session.uuid!),
            user: await getProfileByUUID(uuid),
            discord: false,
            tags: {
                old: oldTag || 'None',
                new: tag
            }
        });

        if(player?.isEmailVerified()) {
            sendTagChangeEmail(player.connections.email.address!, oldTag || '---', tag, getI18nFunctionByLanguage(player.last_language));
        }
    }

    if(isWatched && notifyWatch) sendWatchlistTagUpdateMessage(await getProfileByUUID(uuid), tag);
    return { message: i18n(`setTag.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Changes your global tag'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your tag was changed' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re banned.' }),
        409: t.Object({ error: t.String() }, { description: 'You already have this tag' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    body: t.Object({ tag: t.String({ error: 'error.wrongType;;[["field", "tag"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/', async ({ session, params, i18n, error }) => { // Delete tag
    if(!session || !session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(session.equal && player.isBanned()) return error(403, { error: i18n('error.banned') });
    if(!player.tag) return error(404, { error: i18n('error.noTag') });

    if(!session.equal) {
        sendModLogMessage({
            logType: ModLogType.ClearTag,
            staff: await getProfileByUUID(session.uuid!),
            user: await getProfileByUUID(uuid),
            discord: false
        });
        player.clearTag(session.uuid!);
        sendTagClearEmail(player.connections.email.address!, player.tag, getI18nFunctionByLanguage(player.last_language));
    }
    player.tag = null;
    await player.save();

    return { message: i18n(`resetTag.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Deletes your global tag'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your tag was deleted' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re banned' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});