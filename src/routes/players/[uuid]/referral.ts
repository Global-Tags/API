import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Player } from "../../../libs/database/schemas/Player";
import { tResponseBody, tHeaders, tParams, tRequestBody } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { Permission } from "../../../types/Permission";
import Logger from "../../../libs/Logger";
import { t } from "elysia";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, status }) => { // Get referrals and referrer
    if(!session?.selfOrHasPermission(Permission.ViewReferrals)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await session.getOrCreateDocument();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    const referrer = await player.getReferrer();

    return {
        referrer: referrer === null ? null : {
            uuid: referrer.uuid,
            referred_at: referrer.referrals.total.find((ref) => ref.uuid === player.uuid)?.referred_at.getTime() || -1
        },
        referrals: player.referrals.total.map((uuid) => ({
            uuid: uuid.uuid,
            referred_at: uuid.referred_at.getTime()
        }))
    };
}, {
    detail: {
        tags: [DocumentationCategory.Referrals],
        description: 'Get referrals and referrer of the player'
    },
    response: {
        200: t.Object({
            referrer: t.Nullable(tResponseBody.Referral),
            referrals: t.Array(tResponseBody.Referral, { description: 'A list of referrals' })
        }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error
    },
    params: tParams.uuid,
    headers: tHeaders
}).post('/', async ({ session, body, i18n, status }) => { // Mark player as referrer
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