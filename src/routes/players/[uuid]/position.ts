import { t } from "elysia";
import { getOrCreatePlayer } from "../../../database/schemas/players";
import { Permission } from "../../../types/Permission";
import { GlobalPosition } from "../../../types/GlobalPosition";
import { capitalCase, snakeCase } from "change-case";
import { GameProfile } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendTagChangeEmail } from "../../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";

export default (app: ElysiaApp) => app.post('/', async ({ session, body: { position }, params, i18n, status }) => { // Change tag position
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerPositions)) return status(403, { error: i18n('$.error.notAllowed') });

    position = position.toLowerCase();
    if(!(capitalCase(position) in GlobalPosition)) return status(422, { error: i18n('$.position.invalid') });

    const player = await getOrCreatePlayer(params.uuid);
    if(session.self && player.isBanned()) return status(403, { error: i18n('$.error.banned') });
    if(snakeCase(player.position) == position) return status(400, { error: i18n('$.position.samePosition') });

    const oldPosition = player.position;
    player.position = position;
    await player.save();

    if(!session.self && session.player) {
        sendModLogMessage({
            logType: ModLogType.EditPosition,
            staff: await session.player.getGameProfile(),
            user: await player.getGameProfile(),
            discord: false,
            positions: {
                old: oldPosition || '---',
                new: position
            }
        });

        if(player.isEmailVerified()) {
            sendTagChangeEmail(player.connections.email.address!, oldPosition || '---', position, getI18nFunctionByLanguage(player.last_language));
        }
    }

    return { message: i18n(session.self ? '$.position.success.self' : '$.position.success.admin') };
}, {
    detail: {
        tags: ['Settings'],
        description: 'Changes your GlobalTag position'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The tag position was updated' }),
        400: t.Object({ error: t.String() }, { description: 'You provided an invalid position' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to change your tag position' }),
        409: t.Object({ error: t.String() }, { description: 'Your tag is already in that position' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ position: t.String({ error: '$.error.wrongType;;[["field", "position"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'Your UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});