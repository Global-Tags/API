import { t } from "elysia";
import { getOrCreatePlayer } from "../../../database/schemas/Player";
import { Permission } from "../../../types/Permission";
import { GlobalPosition, positions } from "../../../types/GlobalPosition";
import { ElysiaApp } from "../../..";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { sendTagChangeEmail } from "../../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../../middleware/fetch-i18n";
import { tResponseBody, tHeaders, tParams } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.post('/', async ({ session, body: { position }, params, i18n, status }) => { // Change tag position
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerPositions)) return status(403, { error: i18n('$.error.notAllowed') });

    const globalPosition = position.toLowerCase() as GlobalPosition;
    if(!positions.includes(globalPosition)) return status(422, { error: i18n('$.position.invalid') });

    const player = await getOrCreatePlayer(params.uuid);
    if(session.self && player.isBanned()) return status(403, { error: i18n('$.error.banned') });
    if(player.position == position) return status(409, { error: i18n('$.position.samePosition') });

    const oldPosition = player.position;
    player.position = globalPosition;
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

        if(player.email.verified) {
            sendTagChangeEmail(player.email.address!, oldPosition || '---', position, getI18nFunctionByLanguage(player.preferred_language));
        }
    }

    return { message: i18n(session.self ? '$.position.success.self' : '$.position.success.admin') };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Change your GlobalTag position',
        deprecated: true
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        409: tResponseBody.Error,
        422: tResponseBody.Error,
    },
    body: t.Object({ position: t.String({ error: '$.error.wrongType;;[["field", "position"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }), // TODO: Merge with other settings
    params: tParams.uuid,
    headers: tHeaders
});