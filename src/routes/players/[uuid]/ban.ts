import Elysia, { t } from "elysia";
import players from "../../../database/schemas/players";
import fetchI18n, { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { ModLogType, sendBanAppealMessage, sendModLogMessage } from "../../../libs/discord-notifier";
import getAuthProvider from "../../../middleware/get-auth-provider";
import { sendBanEmail, sendUnbanEmail } from "../../../libs/mailer";
import { Permission } from "../../../types/Permission";
import { getProfileByUUID } from "../../../libs/game-profiles";

export default new Elysia({
    prefix: `/ban`
}).use(fetchI18n).use(getAuthProvider).get(`/`, async ({ error, params, headers, i18n, provider }) => { // Get ban info
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageBans)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });

    return { banned: player.isBanned(), reason: player.isBanned() ? player.ban.reason || null : null, appealable: player.ban.appealable || false };
}, {
    detail: {
        tags: ['Admin'],
        description: `Get info about the ban of a specific player`
    },
    response: {
        200: t.Object({ banned: t.Boolean(), reason: t.Union([t.String(), t.Null()], { default: "…" }), appealable: t.Boolean() }, { description: 'The ban object.' }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage bans." }),
        404: t.Object({ error: t.String() }, { description: "The player you searched for was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the ban of.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/`, async ({ error, params, headers, body, i18n, provider }) => { // Ban player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageBans)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(player.isBanned()) return error(400, { error: i18n(`ban.alreadyBanned`) });
    const { reason } = body;

    player.banPlayer(reason, session.uuid!);
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Ban,
        staff: await getProfileByUUID(session.uuid!),
        user: await getProfileByUUID(uuid),
        discord: false,
        reason: reason
    });

    if(player.isEmailVerified()) {
        sendBanEmail(player.connections.email.address!, reason || '---', getI18nFunctionByLanguage(player.last_language));
    }

    return { message: i18n(`ban.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Ban a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully banned.' }),
        400: t.Object({ error: t.String() }, { description: "The player is already banned." }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage bans." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to ban was not found." })
    },
    body: t.Object({ reason: t.String() }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to ban.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).put(`/`, async ({ error, params, headers, body, i18n, provider }) => { // Update ban info - I need to use put here bc labymod's Request system doesn't support PATCH
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageBans)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(400, { error: i18n(`unban.notBanned`) });
    const reason = body.reason || i18n(`ban.noReason`);

    player.ban.reason = reason;
    player.ban.appealable = body.appealable;
    await player.save();

    sendModLogMessage({
        logType: ModLogType.EditBan,
        user: await getProfileByUUID(uuid),
        staff: await getProfileByUUID(session.uuid!),
        discord: false,
        appealable: body.appealable,
        reason: reason
    });

    return { message: i18n(`editBan.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Edit the ban info of a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The ban info was successfully edited.' }),
        400: t.Object({ error: t.String() }, { description: "The player is not banned." }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage bans." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to edit the ban info of was not found." })
    },
    body: t.Object({ reason: t.Optional(t.String()), appealable: t.Boolean({ error: 'error.wrongType;;[["field", "appealable"], ["type", "boolean"]]' }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to edit the ban of.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/appeal`, async ({ error, params, headers, body: { reason }, i18n, provider }) => { // Ban player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player || !player.isBanned()) return error(404, { error: i18n(`appeal.notBanned`) });
    if(!player.ban.appealable) return error(403, { error: i18n(`appeal.notAppealable`) });
    if(player.ban.appealed) return error(403, { error: i18n(`appeal.alreadyAppealed`) });

    player.ban.appealed = true;
    await player.save();

    sendBanAppealMessage(
        await getProfileByUUID(uuid),
        reason
    );

    return { message: i18n(`appeal.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Request to be unbanned by the admins`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your appeal was successfully sent.' }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to appeal or have already sent an appeal." }),
        404: t.Object({ error: t.String() }, { description: "You're not banned." })
    },
    body: t.Object({ reason: t.String() }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/`, async ({ error, params, headers, i18n, provider }) => { // Unban player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.hasPermission(Permission.ManageBans)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(400, { error: i18n(`unban.notBanned`) });

    player.unban();
    await player.save();

    sendModLogMessage({
        logType: ModLogType.Unban,
        staff: await getProfileByUUID(session.uuid!),
        user: await getProfileByUUID(uuid),
        discord: false
    });

    if(player.isEmailVerified()) {
        sendUnbanEmail(player.connections.email.address!, getI18nFunctionByLanguage(player.last_language));
    }

    return { message: i18n(`unban.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Unban a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully unbanned.' }),
        400: t.Object({ error: t.String() }, { description: "The player is not banned." }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to manage bans." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to unban was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to unban.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});