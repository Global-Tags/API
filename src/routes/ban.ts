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
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed` }) }, { error: `error.notAllowed` })
}).post(`/`, async ({ error, params, headers, body, i18n }) => { // Ban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(player.isBanned()) return error(409, { error: i18n(`ban.alreadyBanned`) });
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
    body: t.Object({ reason: t.Optional(t.String()) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed` }) }, { error: `error.notAllowed` })
}).put(`/`, async ({ error, params, headers, body, i18n }) => { // Update ban info - I need to use put here bc labymod's Request system doesn't support PATCH
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(409, { error: i18n(`unban.notBanned`) });
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
    body: t.Object({ reason: t.Optional(t.String()), appealable: t.Boolean({ error: 'error.wrongType;;[["field", "appealable"], ["type", "boolean"]]' }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed` }) }, { error: `error.notAllowed` })
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
    body: t.Object({ reason: t.String() }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed` }) }, { error: `error.notAllowed` })
}).delete(`/`, async ({ error, params, headers, i18n }) => { // Unban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(409, { error: i18n(`unban.notBanned`) });

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
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed` }) }, { error: `error.notAllowed` })
});