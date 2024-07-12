import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import { bot } from "../../config.json";
import getAuthProvider from "../middleware/GetAuthProvider";

export default new Elysia({
    prefix: "/connections"
}).use(fetchI18n).use(getAuthProvider).post(`/discord`, async ({ error, params, headers, body, i18n, provider }) => { // Get a linking code
    if(!bot.connection.active) return error(409, { error: i18n('connections.discord.disabled') });
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(player.connections!.discord!.id) return error(400, { error: i18n(`connections.discord.alreadyConnected`) });
    if(player.connections!.discord!.code) return { code: player.connections!.discord!.code };

    const code = Date.now().toString(36);
    player.connections!.discord!.code = code;
    await player.save();

    return { code };
}, {
    detail: {
        tags: ['Connections'],
        description: `Receive a code to link your Discord account with '/link' on the discord server`
    },
    response: {
        200: t.Object({ code: t.String() }, { description: `You received a linking code.` }),
        400: t.Object({ error: t.String() }, { description: `You already have a Discord account connected.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a GlobalTags account.` }),
        409: t.Object({ error: t.String() }, { description: `Account linking is deactivated.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/discord`, async ({ error, params, headers, body, i18n, provider }) => { // Change icon
    if(!bot.connection.active) return error(409, { error: i18n('connections.discord.disabled') });
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`error.banned`) });
    if(!player.connections!.discord!.id) return error(400, { error: i18n(`connections.discord.notConnected`) });

    player.connections!.discord!.id = null;
    player.connections!.discord!.code = null;
    await player.save();

    return { message: i18n('connections.discord.unlinked') };
}, {
    detail: {
        tags: ['Connections'],
        description: `Unlink your connected discord account.`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `Your account was successfully unlinked.` }),
        400: t.Object({ error: t.String() }, { description: `You don't have a Discord account connected.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a GlobalTags account.` }),
        409: t.Object({ error: t.String() }, { description: `Account linking is deactivated.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});