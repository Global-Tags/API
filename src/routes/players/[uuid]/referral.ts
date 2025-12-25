import { sendReferralMessage } from "../../../libs/discord-notifier";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { getOrCreatePlayer, Player } from "../../../database/schemas/Player";
import { tResponseBody, tHeaders, tParams } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

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
        tags: [DocumentationCategory.Referrals],
        description: 'Mark another player as your referrer'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error
    },
    params: tParams.uuid,
    headers: tHeaders
});