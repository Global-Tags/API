import Elysia, { t } from "elysia";
import { validJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";

export default new Elysia({
    prefix: "/position"
}).use(fetchI18n).post(`/`, async ({ error, params, headers, body, i18n }) => { // Change tag position
    const uuid = params.uuid.replaceAll(`-`, ``);
    const position = body.position.toUpperCase();
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    if(!authenticated) return error(401, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(!player.tag) return error(404, { error: i18n(`error.noTag`) });
    if(![`ABOVE`, `BELOW`, `RIGHT`, `LEFT`].includes(position)) return error(422, { error: i18n(`position.invalid`) });
    if(position == player.position) return error(400, { error: i18n(`position.samePosition`) });

    player.position = position as "ABOVE" | "BELOW" | "RIGHT" | "LEFT";
    await player.save();

    return { message: i18n(`position.success`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change your global tag's position`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The tag position was successfully changed` }),
        400: t.Object({ error: t.String() }, { description: `You provided an invalid position.` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag to change the position of.` }),
        406: t.Object({ error: t.String() }, { description: `You tried to change your tag to the position it's already set to.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ position: t.String({ error: `Missing field "position".` }) }, { error: `Missing field "position".` }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!`, description: `Your LabyConnect JWT` }) }, { error: `You're not authorized!` })
});