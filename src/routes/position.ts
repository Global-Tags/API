import Elysia, { t } from "elysia";
import { validJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";

export default new Elysia({
    prefix: "/position"
}).post(`/`, async ({ error, params, headers, body }) => { // Change tag position
    const uuid = params.uuid.replaceAll(`-`, ``);
    const position = body.position.toUpperCase();
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `You don't have a tag!` });
    if(player.isBanned()) return error(403, { error: `You are banned!` });
    if(!player.tag) return error(404, { error: `Please set a tag first!` });
    if(![`ABOVE`, `BELOW`, `RIGHT`, `LEFT`].includes(position)) return error(404, { error: `Please provide a position!` });
    if(position == player.position) return error(400, { error: `Your tag is already in this position!` });

    player.position = position as "ABOVE" | "BELOW" | "RIGHT" | "LEFT";
    await player.save();

    return { message: `Your position was successfully set!` };
}, {
    body: t.Object({ position: t.String() }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String() })
});