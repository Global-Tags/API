import Elysia, { t } from "elysia";
import { getUuidByJWT, getJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import { ModLogType, NotificationType, sendMessage } from "../libs/DiscordNotifier";

export default new Elysia({
    prefix: `/ban`
}).use(fetchI18n).get(`/`, async ({ error, params, headers, i18n }) => { // Get ban info
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });

    return { banned: player.isBanned(), reason: player.isBanned() ? player.ban?.reason || null : null, appealable: player.ban?.appealable || false };
}, {
    detail: {
        tags: ['Admin'],
        description: `Get info about the ban of a specific player`
    },
    response: {
        200: t.Object({ banned: t.Boolean(), reason: t.Union([t.String(), t.Null()], { default: "…" }), appealable: t.Boolean() }, { description: 'The ban object.' }),
        403: t.Object({ error: t.String() }, { description: "You're not an admin." }),
        404: t.Object({ error: t.String() }, { description: "The player you searched for was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the ban of.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/`, async ({ error, params, headers, body, i18n }) => { // Ban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(player.isBanned()) return error(400, { error: i18n(`ban.alreadyBanned`) });
    const reason = body.reason || i18n(`ban.noReason`);

    player.banPlayer(reason);
    await player.save();
    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.Ban,
        uuid: uuid,
        staff: session.uuid || 'Unknown',
        reason: reason
    });

    return { message: i18n(`ban.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Ban a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully banned.' }),
        400: t.Object({ error: t.String() }, { description: "The player is already banned." }),
        403: t.Object({ error: t.String() }, { description: "You're not an admin." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to ban was not found." })
    },
    body: t.Object({ reason: t.Optional(t.String()) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to ban.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).put(`/`, async ({ error, params, headers, body, i18n }) => { // Update ban info - I need to use put here bc labymod's Request system doesn't support PATCH
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(400, { error: i18n(`unban.notBanned`) });
    const reason = body.reason || i18n(`ban.noReason`);

    player.ban!.reason = reason;
    player.ban!.appealable = body.appealable;
    await player.save();
    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.EditBan,
        uuid: uuid,
        staff: session.uuid || 'Unknown',
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
        403: t.Object({ error: t.String() }, { description: "You're not an admin." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to edit the ban info of was not found." })
    },
    body: t.Object({ reason: t.Optional(t.String()), appealable: t.Boolean({ error: 'error.wrongType;;[["field", "appealable"], ["type", "boolean"]]' }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to edit the ban of.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).post(`/appeal`, async ({ error, params, headers, body: { reason }, i18n }) => { // Ban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player || !player.isBanned()) return error(404, { error: i18n(`appeal.notBanned`) });
    if(!player.ban?.appealable) return error(403, { error: i18n(`appeal.notAppealable`) });
    if(player.ban?.appealed) return error(403, { error: i18n(`appeal.alreadyAppealed`) });

    player.ban!.appealed = true;
    player.save();

    sendMessage({
        type: NotificationType.Appeal,
        uuid,
        reason
    });

    return { message: i18n(`appeal.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Request to be unbanned by the admins`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your appeal was successfully sent.' }),
        403: t.Object({ error: t.String() }, { description: "You're not allowed to appeal or have already sent an appeal." }),
        404: t.Object({ error: t.String() }, { description: "You're not banned." })
    },
    body: t.Object({ reason: t.String() }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/`, async ({ error, params, headers, i18n }) => { // Unban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(400, { error: i18n(`unban.notBanned`) });

    player.unban();
    await player.save();
    sendMessage({
        type: NotificationType.ModLog,
        logType: ModLogType.Unban,
        uuid: uuid,
        staff: session.uuid || 'Unknown'
    });

    return { message: i18n(`unban.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: `Unban a player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully unbanned.' }),
        400: t.Object({ error: t.String() }, { description: "The player is not banned." }),
        403: t.Object({ error: t.String() }, { description: "You're not an admin." }),
        404: t.Object({ error: t.String() }, { description: "The player you tried to unban was not found." })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to unban.' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});