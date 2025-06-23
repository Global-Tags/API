import { t } from "elysia";
import { sendReferralMessage } from "../../../libs/discord-notifier";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { getOrCreatePlayer, Player } from "../../../database/schemas/Player";

export default (app: ElysiaApp) => app.post('/', async ({ session, params, i18n, status }) => { // Mark player as referrer
    if(!session?.uuid) return status(403, { error: i18n('$.error.notAllowed') });
    if(session.self) return status(403, { error: i18n('$.referral.self') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const executor = await getOrCreatePlayer(session.uuid);
    if(await executor.hasReferrer()) return status(409, { error: i18n('$.referral.alreadyReferred') });
    
    player.addReferral(session.uuid);
    await player.save();

    sendReferralMessage(await player.getGameProfile(), await executor.getGameProfile());
    return { message: i18n('$.referral.success') };
}, {
    detail: {
        tags: ['Interactions'],
        description: 'Marks another player as your referrer'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully marked as your referrer' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to mark this player as your referrer' }),
        404: t.Object({ error: t.String() }, { description: 'The player is not a GlobalTags user' }),
        409: t.Object({ error: t.String() }, { description: 'You have already marked someone as your referrer' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to refer to' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});