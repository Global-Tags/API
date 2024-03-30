import Elysia, { t } from "elysia";
import { getUuidByJWT, validJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";

export default new Elysia({
    prefix: `/ban`
}).get(`/`, async ({ error, params, headers, body }) => { // Get ban info
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const executor = await players.findOne({ uuid: getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return error(403, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `There is no such player in our records!` });

    return { banned: player.isBanned(), reason: player.isBanned() ? player.ban?.reason || null : null };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String() })
}).post(`/`, async ({ error, params, headers, body }) => { // Ban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const executor = await players.findOne({ uuid: getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return error(403, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `There is no such player in our records!` });
    if(player.isBanned()) return error(409, { error: `This player is already banned!` });

    player.ban = {
        active: true,
        reason: body.reason || `No reason provided`
    }
    await player.save();

    return { message: `The player was successfully banned!` };
}, {
    body: t.Object({ reason: t.String() }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String() })
}).delete(`/`, async ({ error, params, headers, body }) => { // Unban player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const executor = await players.findOne({ uuid: getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return error(403, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `There is no such player in our records!` });
    if(!player.isBanned()) return error(409, { error: `This player is not banned!` });

    player.ban = {
        active: false,
        reason: undefined
    }
    await player.save();

    return { message: `The player was successfully unbanned!` };
}, {
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String() })
});