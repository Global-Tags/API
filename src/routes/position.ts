import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import getAuthProvider from "../middleware/GetAuthProvider";
import GlobalPosition from "../types/GlobalPosition";
import { Permission } from "../types/Permission";

const positions = Object.keys(GlobalPosition)
    .filter((pos) => isNaN(Number(pos)))
    .map((pos) => pos.toUpperCase());

export default new Elysia({
    prefix: "/position"
}).use(fetchI18n).use(getAuthProvider).post(`/`, async ({ error, params, headers, body, i18n, provider }) => { // Change tag position
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const position = body.position.toUpperCase();
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal && !session.hasPermission(Permission.ManageTags)) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(!positions.includes(position)) return error(422, { error: i18n(`position.invalid`) });
    if(position == player.position) return error(400, { error: i18n(`position.samePosition`) });

    player.position = position as "ABOVE" | "BELOW" | "RIGHT" | "LEFT";
    await player.save();

    return { message: i18n(`position.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change your global tag's position`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The tag position was successfully changed` }),
        400: t.Object({ error: t.String() }, { description: `You provided an invalid position.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag to change the position of.` }),
        406: t.Object({ error: t.String() }, { description: `You tried to change your tag to the position it's already set to.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ position: t.String({ error: `error.missingField;;[["field", "position"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});