import Elysia, { t } from "elysia";
import { getJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import * as config from "../../config.json";
import fetchI18n from "../middleware/FetchI18n";

export default new Elysia({
    prefix: "/icon"
}).use(fetchI18n).post(`/`, async ({ error, params, headers, body, i18n }) => { // Change icon
    const uuid = params.uuid.replaceAll(`-`, ``);
    const icon = body.icon.toUpperCase();
    const { authorization } = headers;
    if(authorization == `0`) return error(401, { error: i18n(`error.premiumAccount`) });
    const session = await getJWTSession(authorization, uuid);
    if(!session.equal && !session.isAdmin) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(!player.tag) return error(404, { error: i18n(`error.noTag`) });
    if(icon == player.icon) return error(400, { error: i18n(`icon.sameIcon`) });
    if(config.validation.icon.blacklist.includes(icon.toLowerCase())) return error(403, { error: i18n(`icon.notAllowed`) });

    player.icon = icon;
    await player.save();

    return { message: i18n(`icon.success.${session.equal ? 'self' : 'admin'}`) };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change the icon which is displayed next to your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The icon was successfully changed` }),
        400: t.Object({ error: t.String() }, { description: `You tried chose an icon that you're already using.` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag to change the icon of.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ icon: t.String({ error: `error.missingField;;[["field", "icon"]]` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});