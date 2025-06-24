import { t } from "elysia";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { ModLogType, sendBanAppealMessage, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendBanEmail, sendUnbanEmail } from "../../../libs/mailer";
import { Permission } from "../../../types/Permission";
import { formatUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Player } from "../../../database/schemas/Player";
import { tHeaders, tResponseBody, tParams, tRequestBody, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get ban list
    if(!session?.player?.hasPermission(Permission.ViewBans)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.bans.map((ban) => ({
        id: ban.id,
        reason: ban.reason,
        staff: formatUUID(ban.staff),
        appealable: ban.appeal.appealable,
        appealed: ban.appeal.appealed,
        banned_at: ban.banned_at.getTime(),
        expires_at: ban.expires_at?.getTime() || null,
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Bans],
        description: 'Get all player bans'
    },
    response: {
        200: t.Array(tSchema.Ban, { description: 'A ban list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
}).get('/:id', async ({ session, params, i18n, status }) => { // Get a specific ban
    if(!session?.player?.hasPermission(Permission.ViewBans)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    
    const ban = player.bans.find(({ id }) => id === params.id);
    if(!ban) return status(404, { error: i18n('$.ban.not_found') });
    const { id, reason, staff, appeal, banned_at, expires_at } = ban;

    return {
        id,
        reason,
        staff: formatUUID(staff),
        appealable: appeal.appealable,
        appealed: appeal.appealable,
        banned_at: banned_at.getTime(),
        expires_at: expires_at?.getTime() || null,
    };
}, {
    detail: {
        tags: [DocumentationCategory.Bans],
        description: 'Get a specific player ban'
    },
    response: {
        200: tSchema.Ban,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndBanId,
    headers: tHeaders
}).post('/', async ({ session, body: { duration, reason, appealable }, params, i18n, status }) => { // Ban player
    if(!session?.player?.hasPermission(Permission.CreateBans)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    if(player.isBanned()) return status(409, { error: i18n('$.ban.already_banned') });

    const expires = duration ? new Date(Date.now() + duration) : null;
    const ban = player.banPlayer({ reason, staff: session.uuid!, appealable, expiresAt: expires })!;
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Ban,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false,
        reason,
        appealable: ban.appeal.appealable,
        expires
    });

    if(player.email.verified) {
        sendBanEmail({
            address: player.email.address!,
            reason: reason || '---',
            appealable: ban.appeal.appealable,
            duration: expires,
            i18n: getI18nFunctionByLanguage(player.preferred_language)
        });
    }

    return {
        id: ban.id,
        reason: ban.reason,
        staff: formatUUID(ban.staff),
        appealable: ban.appeal.appealable,
        appealed: ban.appeal.appealed,
        banned_at: ban.banned_at.getTime(),
        expires_at: ban.expires_at?.getTime() || null,
    };
}, {
    detail: {
        tags: [DocumentationCategory.Bans],
        description: 'Ban a player'
    },
    response: {
        200: tSchema.Ban,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    body: tRequestBody.CreateBan,
    params: tParams.uuid,
    headers: tHeaders
}).patch('/', async ({ session, body: { appealable, reason }, params, i18n, status }) => { // Update ban info
    if(!session?.player?.hasPermission(Permission.EditBans)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    if(!player.isBanned()) return status(409, { error: i18n('$.ban.not_banned') });

    const ban = player.bans.at(-1)!;
    let changed = false;
    reason = reason?.trim();

    if(reason !== undefined && ban.reason != reason) {
        ban.reason = reason.trim();
        changed = true;
    }
    if(appealable !== undefined && ban.appeal.appealable !== appealable) {
        ban.appeal.appealable = appealable;
        changed = true;
    }
    if(changed) {
        // sendModLogMessage({
        //     logType: ModLogType.EditBan,
        //     staff: await session.player.getGameProfile(),
        //     user: await player.getGameProfile(),
        //     discord: false,
        //     appealable: appealable,
        //     reason
        // });
        await player.save();
    }

    return {
        id: ban.id,
        reason: ban.reason,
        staff: formatUUID(ban.staff),
        appealable: ban.appeal.appealable,
        appealed: ban.appeal.appealed,
        banned_at: ban.banned_at.getTime(),
        expires_at: ban.expires_at?.getTime() || null,
    };
}, {
    detail: {
        tags: [DocumentationCategory.Bans],
        description: 'Edit an existing player ban'
    },
    response: {
        200: tSchema.Ban,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    body: tRequestBody.EditBan,
    params: tParams.uuid,
    headers: tHeaders
}).post('/appeal', async ({ session, body: { reason }, i18n, status }) => { // Appeal ban
    if(!session?.self) return status(403, { error: i18n('$.error.notAllowed') });
    reason = reason.trim();
    if(reason.length < 10 || reason.length > 100) return status(422, { error: i18n('$.appeal.reason_validation') });

    const { player } = session;
    if(!player || !player.isBanned()) return status(404, { error: i18n('$.appeal.notBanned') });
    const ban = player.bans.at(-1)!;
    if(!ban.appeal.appealable) return status(403, { error: i18n('$.appeal.notAppealable') });
    if(ban.appeal.appealed) return status(403, { error: i18n('$.appeal.alreadyAppealed') });

    ban.appeal.appealed = true;
    ban.appeal.reason = reason;
    ban.appeal.appealed_at = new Date();
    await player.save();

    sendBanAppealMessage(
        await player.getGameProfile(),
        reason
    );

    return { message: i18n('$.appeal.success') };
}, {
    detail: {
        tags: [DocumentationCategory.Bans],
        description: 'Send a ban appeal'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        422: tResponseBody.Error,
    },
    body: tRequestBody.AppealBan,
    params: tParams.uuid,
    headers: tHeaders
}).delete('/', async ({ session, params, i18n, status }) => { // Unban player
    if(!session?.player?.hasPermission(Permission.DeleteBans)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    if(!player.isBanned()) return status(409, { error: i18n('$.ban.not_banned') });

    player.unban();
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Unban,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false
    });

    if(player.email.verified) {
        sendUnbanEmail(player.email.address!, getI18nFunctionByLanguage(player.preferred_language));
    }

    return { message: i18n('$.ban.unbanned') };
}, {
    detail: {
        tags: [DocumentationCategory.Bans],
        description: 'Unban a player'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
});