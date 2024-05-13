import Elysia, { t } from "elysia";
import { getUuidByJWT, validJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";

export default new Elysia({
    prefix: `/ban`
}).use(fetchI18n).get(`/`, async ({ error, params, headers, i18n }) => { // Get ban info
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(!authenticated) return error(401, { error: i18n(`error.notAllowed`) });

    const executor = await players.findOne({ uuid: getUuidByJWT(authorization)! });
    if(!executor || !executor.admin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });

    return { banned: player.isBanned(), reason: player.isBanned() ? player.ban?.reason || null : null };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!` }) }, { error: `You're not authorized!` })
}).post(`/`, async ({ error, params, headers, body, i18n }) => { // Ban player
    console.log(body.reason);
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(!authenticated) return error(401, { error: i18n(`error.notAllowed`) });

    const executor = await players.findOne({ uuid: getUuidByJWT(authorization)! });
    if(!executor || !executor.admin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(player.isBanned()) return error(409, { error: i18n(`ban.alreadyBanned`) });

    player.ban = {
        active: true,
        reason: body.reason || i18n(`ban.noReason`)
    }
    await player.save();

    return { message: i18n(`ban.success`) };
}, {
    body: t.Object({ reason: t.Optional(t.String()) }, { error: `Unexpected value in body` }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!` }) }, { error: `You're not authorized!` })
}).delete(`/`, async ({ error, params, headers, i18n }) => { // Unban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(!authenticated) return error(401, { error: i18n(`error.notAllowed`) });

    const executor = await players.findOne({ uuid: getUuidByJWT(authorization)! });
    if(!executor || !executor.admin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });
    if(!player.isBanned()) return error(409, { error: i18n(`unban.notBanned`) });

    player.ban = {
        active: false,
        reason: undefined
    }
    await player.save();

    return { message: i18n(`unban.success`) };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!` }) }, { error: `You're not authorized!` })
});