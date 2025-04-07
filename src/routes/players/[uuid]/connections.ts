import { t } from "elysia";
import players from "../../../database/schemas/players";
import getAuthProvider from "../../../middleware/get-auth-provider";
import { sendEmail } from "../../../libs/mailer";
import { randomBytes } from "crypto";
import { config } from "../../../libs/config";
import { sendEmailLinkMessage } from "../../../libs/discord-notifier";
import { GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { onDiscordUnlink } from "../../../libs/events";

export function generateSecureCode(length: number = 10) {
    return randomBytes(length).toString('hex').slice(0, length);
}

export default (app: ElysiaApp) => app.post('/discord', async ({ session, params, i18n, error }) => { // Get a discord linking code
    if(!config.discordBot.notifications.accountConnections.enabled) return error(409, { error: i18n('connections.discord.disabled') });
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(player.connections.discord.id) return error(409, { error: i18n('connections.discord.alreadyConnected') });
    if(player.connections.discord.code) return { code: player.connections.discord.code };

    player.connections.discord.code = generateSecureCode();
    await player.save();

    return { code: player.connections.discord.code };
}, {
    detail: {
        tags: ['Connections'],
        description: 'Returns a code to link your Discord account with \'/link\' with the bot'
    },
    response: {
        200: t.Object({ code: t.String() }, { description: 'You received a linking code' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage connections for this player' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        409: t.Object({ error: t.String() }, { description: 'Account linking is deactivated / You already have a Discord account connected' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/discord', async ({ session, params, i18n, error }) => { // Unlink discord account
    if(!config.discordBot.notifications.accountConnections.enabled) return error(409, { error: i18n('connections.discord.disabled') });
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(!player.connections.discord.id && !player.connections.discord.code) return error(409, { error: i18n('connections.discord.notConnected') });

    await onDiscordUnlink(await player.getGameProfile(), player.connections.discord.id!);

    player.connections.discord.id = null;
    player.connections.discord.code = null;
    await player.save();

    return { message: i18n('connections.discord.unlinked') };
}, {
    detail: {
        tags: ['Connections'],
        description: 'Unlinks your connected discord account'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your account was unlinked' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage connections for this player' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        409: t.Object({ error: t.String() }, { description: 'Account linking is deactivated / You don\'t have a Discord account connected' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).use(getAuthProvider).post('/email', async ({ session, body: { email }, params, i18n, error }) => { // Send verification email
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });
    email = email.trim();

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(player.connections.email.address) return error(409, { error: i18n('connections.email.alreadyConnected') });

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
        description: 'Sends a verification email to your email address'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The verification email was sent' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage connections for this player' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        409: t.Object({ error: t.String() }, { description: 'You already have an email address linked' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ email: t.String({ error: 'connections.email.invalidEmail', format: 'email' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).use(getAuthProvider).post('/email/:code', async ({ session, params, i18n, error }) => { // Verify email
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(player.isEmailVerified()) return error(409, { error: i18n('connections.email.alreadyConnected') });
    if(player.connections.email.code != params.code) return error(403, { error: i18n('connections.email.invalidCode') });

    player.connections.email.code = null;
    await player.save();

    sendEmailLinkMessage(
        await player.getGameProfile(),
        config.discordBot.notifications.accountConnections.hideEmails ? null : player.connections.email.address!,
        true
    );

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
        description: 'Verifies the verification code sent to your inbox'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your email address was verified' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage connections for this player' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        409: t.Object({ error: t.String() }, { description: 'You already have an email address linked' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }), code: t.String({ description: 'Your verification code' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/email', async ({ session, params, i18n, error }) => { // Unlink email
    if(!session?.equal) return error(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.noTag') });
    if(!player.connections.email.address && !player.connections.email.code) return error(400, { error: i18n('connections.email.notConnected') });

    sendEmailLinkMessage(
        await player.getGameProfile(),
        config.discordBot.notifications.accountConnections.hideEmails ? null : player.connections.email.address!,
        false
    );

    player.connections.email.address = null;
    player.connections.email.code = null;
    await player.save();

    return { message: i18n('connections.email.unlinked') };
}, {
    detail: {
        tags: ['Connections'],
        description: 'Unlinks your email'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'Your email was unlinked' }),
        400: t.Object({ error: t.String() }, { description: 'You don\'t have an email address connected' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage connections for this player' }),
        404: t.Object({ error: t.String() }, { description: 'You don\'t have an account' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});