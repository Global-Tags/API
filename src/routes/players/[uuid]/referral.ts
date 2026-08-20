import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Player } from "../../../libs/database/schemas/Player";
import { tResponseBody, tHeaders, tParams, tRequestBody } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { Permission } from "../../../types/Permission";
import Logger from "../../../libs/Logger";

export default (app: ElysiaApp) => app.post('/', async ({ session, body, i18n, status }) => { // Mark player as referrer
    if(!session?.selfOrHasPermission(Permission.ModifyReferrer)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await session.getOrCreateDocument();
    if(await player.hasReferrer()) return status(409, { error: i18n('$.error.referralAlreadySet') });

    const referrerUUID = stripUUID(body.referrer);
    if(player.uuid == referrerUUID) return status(409, { error: i18n('$.error.referralSelf') });
    const referrer = await Player.findOne({ uuid: referrerUUID });
    if(!referrer) return status(404, { error: i18n('$.error.playerNotFound') });

    referrer.addReferral(player.uuid);
    await referrer.save();

    // TODO: add log message
    Logger.info(`Player ${(await player.getGameProfile()).getUsernameOrUUID()} marked ${(await referrer.getGameProfile()).getUsernameOrUUID()} as their referrer`);
    return { message: i18n('$.referral.success') };
}, {
    detail: {
        tags: [DocumentationCategory.Referrals],
        description: 'Set your referrer to another player. This will only work if you have not already set a referrer.'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error
    },
    body: tRequestBody.Referral,
    params: tParams.uuid,
    headers: tHeaders
}).delete('/', async ({ session, params, i18n, status }) => { // Remove referrer from player
    if(!session?.player?.hasPermission(Permission.ModifyReferrer)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const referrer = await player.getReferrer();
    if(!referrer) return status(409, { error: i18n('$.error.referralNotSet') });

    referrer.removeReferral(player.uuid);
    await referrer.save();

    // TODO: add log message
    return { message: i18n('$.referral.removed') };
}, {
    detail: {
        tags: [DocumentationCategory.Referrals],
        description: 'Remove the referrer from the current player'
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