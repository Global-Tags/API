import Elysia, { t } from "elysia";
import { getUuidByJWT, getJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import { NotificationType, sendMessage } from "../libs/DiscordNotifier";

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

    player.ban!.active = true;
    player.ban!.reason = body.reason || i18n(`ban.noReason`);
    await player.save();

    return { message: i18n(`ban.success`) };
}, {
    body: t.Object({ reason: t.Optional(t.String()) }, { error: `error.invalidBody`, additionalProperties: true }),
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

    player.ban!.active = false;
    player.ban!.reason = null;
    await player.save();

    return { message: i18n(`unban.success`) };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed` }) }, { error: `error.notAllowed` })
});