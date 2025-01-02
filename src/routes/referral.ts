import Elysia, { t } from "elysia";
import players from "../database/schemas/players";
import fetchI18n from "../middleware/FetchI18n";
import getAuthProvider from "../middleware/GetAuthProvider";
import { sendReferralMessage } from "../libs/discord-notifier";
import { getProfileByUUID } from "../libs/Mojang";

export default new Elysia({
    prefix: '/referral'
}).use(fetchI18n).use(getAuthProvider).post('/', async ({ error, params, headers, i18n, provider }) => { // Refer to player
    if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
    const uuid = params.uuid.replaceAll('-', '');
    const { authorization } = headers;
    const session = await provider.getSession(authorization, uuid);
    if(!session.uuid) return error(403, { error: i18n('error.notAllowed') });
    if(session.equal) return error(403, { error: i18n('referral.self') });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });

    const executor = await players.findOneAndUpdate({ uuid: session.uuid }, {
        $set: {
            uuid: session.uuid
        }
    }, { upsert: true, new: true });
    if(executor.referrals.has_referred) return error(403, { error: i18n('referral.alreadyReferred') });
    
    player.addReferral(session.uuid);
    await player.save();

    executor.referrals.has_referred = true;
    executor.save();

    sendReferralMessage(await getProfileByUUID(uuid), await getProfileByUUID(executor.uuid));
    return { message: i18n('referral.success') };
}, {
    detail: {
        tags: ['Interactions'],
        description: 'Refer another player which invited you to GlobalTags'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully referred.' }),
        401: t.Object({ error: t.String() }, { description: 'You\'ve passed a malformed authorization header.' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to refer to that player or you have already referred to someone.' }),
        404: t.Object({ error: t.String() }, { description: 'The player you tried to refer to is not a GlobalTags user.' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements.' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited.' }),
        503: t.Object({ error: t.String() }, { description: 'Database is not reachable.' })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to refer to' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your LabyConnect JWT' }) }, { error: `error.notAllowed` })
});