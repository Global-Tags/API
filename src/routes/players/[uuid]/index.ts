import { t } from "elysia";
import Logger from "../../../libs/Logger";
import { ModLogType, sendModLogMessage, sendWatchlistAddMessage, sendWatchlistTagUpdateMessage } from "../../../libs/discord-notifier";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { colorCodesWithSpaces, hexColorCodesWithSpaces, stripColors } from "../../../libs/chat-color";
import { sendTagChangeEmail, sendTagClearEmail } from "../../../libs/mailer";
import { config } from "../../../libs/config";
import { Permission } from "../../../types/Permission";
import { GlobalIcon } from "../../../types/GlobalIcon";
import { formatUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { getOrCreatePlayer, Player } from "../../../database/schemas/Player";
import { tResponseBody } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

const { validation, strictAuth } = config;
const { min, max, blacklist, watchlist } = validation.tag;
const multipleSpaces = /\s{2,}/g;

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get player info
    if(strictAuth) {
        if(!session?.uuid) return status(403, { error: i18n('$.error.notAllowed') });
    }

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNoTag') });

    if(player.icon.type == GlobalIcon.Custom) {
        if(!player.hasPermission(Permission.CustomIcon)) {
            player.icon.type = GlobalIcon.None;
            await player.save();
        }
    }

    return {
        uuid: formatUUID(player.uuid),
        tag: player.isBanned() ? null : player.tag || null,
        position: player.position,
        icon: player.icon,
        roleIcon: player.getActiveRoles().find((role) => role.role.hasIcon)?.role.name || null,
        roles: player.getActiveRoles().map((role) => role.role.name),
        permissions: player.getActiveRoles().reduce((acc, role) => acc | role.role.permissions, 0),
        referrals: {
            has_referred: await player.hasReferrer(),
            total_referrals: player.referrals.total.length,
            current_month_referrals: player.referrals.current_month
        }
    };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Get a players\' tag info'
    },
    response: {
        200: tResponseBody.TagData,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: t.Object({ uuid: t.String({ description: 'The uuid of the player you want to fetch the info of' }) }),
    headers: t.Object({ authorization: strictAuth ? t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) : t.Optional(t.String({ description: 'Your authentication token' })) }, { error: '$.error.notAllowed' }),
}).get('/history', async ({ session, params, i18n, status }) => { // Get player's tag and icon history
    if(!session || session?.self && !session.player?.hasPermission(Permission.ViewTagHistory)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNoTag') });

    return player.tag_history.map((tag) => ({
        tag: tag.content,
        timestamp: tag.timestamp.getTime(),
        flagged_words: watchlist.filter((entry) => stripColors(tag.content).trim().toLowerCase().includes(entry))
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Get a players\' tag history'
    },
    response: {
        200: t.Array(t.Object({ tag: t.String(), timestamp: t.Number(), flagged_words: t.Array(t.String()) }), { description: 'The tag history' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: t.Object({ uuid: t.String({ description: 'The uuid of the player you want to fetch the info of' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' }),
}).post('/', async ({ session, body: { tag }, params, i18n, status }) => { // Change tag
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerTags)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await getOrCreatePlayer(params.uuid);
    if(session.self && player.isBanned()) return status(403, { error: i18n('$.error.banned') });

    let isWatched = false;
    let isWatchedInitially = false;
    const gameProfile = await player.getGameProfile();
    if(!session.player?.hasPermission(Permission.BypassValidation)) {
        tag = tag.trim().replace(multipleSpaces, ' ').replace(colorCodesWithSpaces, '').replace(hexColorCodesWithSpaces, '');
        const strippedTag = stripColors(tag);
        if(strippedTag == '') return status(422, { error: i18n('$.setTag.empty') });
        if(strippedTag.length < min || strippedTag.length > max) return status(422, { error: i18n('$.setTag.validation').replace('<min>', String(min)).replace('<max>', String(max)) });
        const blacklistedWord = blacklist.find((word) => strippedTag.toLowerCase().includes(word));
        if(blacklistedWord) return status(422, { error: i18n('$.setTag.blacklisted').replaceAll('<word>', blacklistedWord) });
        isWatched = (player && false) || watchlist.some((word) => { // TODO: Reimplement watchlist instead of 'false'
            if(strippedTag.toLowerCase().includes(word)) {
                Logger.warn(`Now watching ${player.uuid} for matching "${word}" in "${tag}".`);
                sendWatchlistAddMessage({ player: gameProfile, tag, word });
                isWatchedInitially = true;
                return true;
            }
            return false;
        });
    }

    if(player.tag == tag) return status(409, { error: i18n('$.setTag.sameTag') });

    const oldTag = player.tag;
    player.tag = tag;
    // if(isWatched) player.watchlist = true;
    await player.save();
    
    if(!session.self && session.player) {
        sendModLogMessage({
            logType: ModLogType.ChangeTag,
            staff: await session.player.getGameProfile(),
            user: gameProfile,
            discord: false,
            tags: {
                old: oldTag || 'None',
                new: tag
            }
        });

        if(player.email.verified) {
            sendTagChangeEmail(player.email.address!, oldTag || '---', tag, getI18nFunctionByLanguage(player.preferred_language));
        }
    }

    if(isWatched && !isWatchedInitially) sendWatchlistTagUpdateMessage(gameProfile, tag);
    return { message: i18n(session.self ? '$.setTag.success.self' : '$.setTag.success.admin') };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Change your GlobalTag',
        deprecated: true
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        409: tResponseBody.Error,
        422: tResponseBody.Error,
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    body: t.Object({ tag: t.String({ error: '$.error.wrongType;;[["field", "tag"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }), // TODO: Merge with other settings
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).delete('/', async ({ session, params, i18n, status }) => { // Delete tag
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerTags)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.noTag') });
    if(session.self && player.isBanned()) return status(403, { error: i18n('$.error.banned') });
    if(!player.tag) return status(404, { error: i18n('$.error.noTag') });

    if(!session.self && session.player) {
        sendModLogMessage({
            logType: ModLogType.ClearTag,
            staff: await session.player.getGameProfile(),
            user: await player.getGameProfile(),
            discord: false
        });
        if(player.email.verified) {
            sendTagClearEmail(player.email.address!, player.tag, getI18nFunctionByLanguage(player.preferred_language));
        }
        // player.clearTag(session.uuid!); // TODO: Reimplement clearTag
    } else {
        player.tag = null;
    }
    await player.save();

    return { message: i18n(session.self ? '$.resetTag.success.self' : '$.resetTag.success.admin') };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Delete your GlobalTag'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});