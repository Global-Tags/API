import Elysia, { t } from "elysia";
import { getJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";

export default new Elysia({
    prefix: "/font"
}).use(fetchI18n).post(`/`, async ({ error, params, headers, body, i18n }) => { // Change font
    const uuid = params.uuid.replaceAll(`-`, ``);
    const font = body.font.toUpperCase();
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.equal && !session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(font == player.font) return error(400, { error: i18n(`font.sameFont`) });

    player.font = font;
    await player.save();

    return { message: i18n(`font.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change the font in which your global tag is displayed to other players`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The font was successfully changed` }),
        400: t.Object({ error: t.String() }, { description: `You tried chose a font that you're already using.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag to change the font of.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ font: t.String({ error: `error.missingField;;[["field", "font"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});