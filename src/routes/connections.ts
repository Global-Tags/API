import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import getAuthProvider from "../middleware/GetAuthProvider";
import { sendEmail } from "../libs/Mailer";
import { randomBytes } from "crypto";
import { config } from "../libs/Config";
import { NotificationType, sendMessage } from "../libs/DiscordNotifier";

export function generateSecureCode(length: number = 10) {
    return randomBytes(length).toString('hex').slice(0, length);
}

export default new Elysia({
    prefix: "/connections"
}).use(fetchI18n).use(getAuthProvider).post(`/discord`, async ({ error, params, headers, i18n, provider }) => { // Get a linking code
    if(!config.discordBot.notifications.accountConnections.enabled) return error(409, { error: i18n('connections.discord.disabled') });
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.equal) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.noTag`) });
    if(player.connections.discord.id) return error(400, { error: i18n(`connections.discord.alreadyConnected`) });
    if(player.connections.discord.code) return { code: player.connections.discord.code };

    player.connections.discord.code = generateSecureCode();
    await player.save();

    return { code: player.connections.discord.code };
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
}).delete(`/discord`, async ({ error, params, headers, i18n, provider }) => { // Change icon
    if(!config.discordBot.notifications.accountConnections.enabled) return error(409, { error: i18n('connections.discord.disabled') });
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

    player.connections.email.address = email;
    player.connections.email.code = generateSecureCode();
    await player.save();

    sendEmail({
        recipient: email,
        subject: i18n('email.verification.subject'),
        template: 'verification',
        variables: [
            ['title', i18n('email.verification.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.verification.description')],
            ['code', player.connections.email.code],
            ['button', i18n('email.verification.button')],
            ['note', i18n('email.verification.note')],
            ['footer', i18n('email.footer')],
        ]
    });

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
    if(player.connections.email.code !== params.code) return error(403, { error: i18n(`connections.email.invalidCode`) });

    player.connections.email.code = null;
    await player.save();

    sendMessage({
        type: NotificationType.EmailLink,
        connected: true,
        uuid: player.uuid
    });

    sendEmail({
        recipient: player.connections.email.address!,
        subject: i18n('email.verified.subject'),
        template: 'verified',
        variables: [
            ['title', i18n('email.verified.title')],
            ['success', i18n('email.verified.success')],
            ['questions', i18n('email.verified.questions')],
            ['link', 'https://globaltags.xyz/discord'],
            ['footer', i18n('email.footer')],
        ]
    });

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
    params: t.Object({ uuid: t.String({ description: `Your UUID` }), code: t.String({ description: 'Your verification code' }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
}).delete(`/email`, async ({ error, params, headers, i18n, provider }) => { // Change icon
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

    sendMessage({
        type: NotificationType.EmailLink,
        connected: false,
        uuid: player.uuid
    });

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