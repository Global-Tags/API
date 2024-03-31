import Elysia, { t } from "elysia";
import { validJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import * as config from "../../config.json";

export default new Elysia({
    prefix: "/icon"
}).post(`/`, async ({ error, params, headers, body }) => { // Change icon
    const uuid = params.uuid.replaceAll(`-`, ``);
    const icon = body.icon.toUpperCase();
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `You don't have a tag!` });
    if(player.isBanned()) return error(403, { error: `You are banned!` });
    if(!player.tag) return error(404, { error: `Please set a tag first!` });
    if(icon == player.icon) return error(400, { error: `You already chose this icon!` });
    if(config.validation.icon.blacklist.includes(icon.toLowerCase())) return error(403, { error: `You're not allowed to choose this icon!` });

    player.icon = icon;
    await player.save();

    return { message: `Your icon was successfully set!` };
}, {
    body: t.Object({ icon: t.String({ error: `Missing field "icon".` }) }, { error: `Missing field "icon".` }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!` }) }, { error: `You're not authorized!` })
});