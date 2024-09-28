import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import { bot } from "../../config.json";
import getAuthProvider from "../middleware/GetAuthProvider";

const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

export default new Elysia({
    prefix: "/connections"
}).use(fetchI18n).use(getAuthProvider).post(`/discord`, async ({ error, params, headers, i18n, provider }) => { // Get a linking code
    if(!bot.connection.active) return error(409, { error: i18n('connections.discord.disabled') });
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.connections.discord.id) return error(400, { error: i18n(`connections.discord.alreadyConnected`) });
    if(player.connections.discord.code) return { code: player.connections.discord.code };

    const code = Date.now().toString(36);
    player.connections.discord.code = code;
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
        403: t.Object({ error: t.String() }, { description: `You're now allowed to manage connections for this player.` }),
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
    if(!player.connections.discord.id && !player.connections.discord.code) return error(400, { error: i18n(`connections.discord.notConnected`) });

    player.connections.discord.id = null;
    player.connections.discord.code = null;
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
        403: t.Object({ error: t.String() }, { description: `You're now allowed to manage connections for this player.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a GlobalTags account.` }),
        409: t.Object({ error: t.String() }, { description: `Account linking is deactivated.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).use(getAuthProvider).post(`/email`, async ({ error, params, headers, body: { email }, i18n, provider }) => { // Send verification email
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    email = email.trim();
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.connections.email.address) return error(400, { error: i18n(`connections.email.alreadyConnected`) });

    const code = Date.now().toString(36);
    player.connections.email.address = email;
    player.connections.email.code = code;
    await player.save();

    // Send email

    return { message: i18n('connections.email.verificationSent') };
}, {
    detail: {
        tags: ['Connections'],
        description: `Sends a verification email to your email address.`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The verification email was sent.` }),
        400: t.Object({ error: t.String() }, { description: `You already have an email address linked.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're now allowed to manage connections for this player.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a GlobalTags account.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ email: t.String({ error: 'connections.email.invalidEmail', format: 'email' }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).use(getAuthProvider).post(`/email/:code`, async ({ error, params, headers, i18n, provider }) => { // Send verification email
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.isEmailVerified()) return error(400, { error: i18n(`connections.email.alreadyConnected`) });

    player.connections.email.code = null;
    await player.save();

    // Send email

    return { message: i18n('connections.email.verified') };
}, {
    detail: {
        tags: ['Connections'],
        description: `Sends a verification email to your email address.`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `Your email was successfully verified.` }),
        400: t.Object({ error: t.String() }, { description: `You already have an email address linked.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're now allowed to manage connections for this player.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a GlobalTags account.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ email: t.String({ error: 'connections.email.invalidEmail', format: 'email' }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }), code: t.String({ description: 'Your verification code' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/email`, async ({ error, params, headers, body, i18n, provider }) => { // Change icon
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(!player.connections.email.address && !player.connections.email.code) return error(400, { error: i18n(`connections.email.notConnected`) });

    player.connections.email.address = null;
    player.connections.email.code = null;
    await player.save();

    return { message: i18n('connections.email.unlinked') };
}, {
    detail: {
        tags: ['Connections'],
        description: `Unlink your email.`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `Your email was successfully unlinked.` }),
        400: t.Object({ error: t.String() }, { description: `You don't have an email address connected.` }),
        401: t.Object({ error: t.String() }, { description: "You've passed a malformed authorization header." }),
        403: t.Object({ error: t.String() }, { description: `You're now allowed to manage connections for this player.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a GlobalTags account.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});