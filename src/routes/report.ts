import Elysia, { t } from "elysia";
import { getUuidByJWT, validJWTSession } from "../libs/SessionValidator";
import * as config from "../../config.json";
import players from "../database/schemas/players";
import { NotificationType, sendMessage } from "../libs/DiscordNotifier";

export default new Elysia({
    prefix: "/report"
}).post(`/`, async ({ error, params, headers, body }) => { // Report player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `This player does not have a tag!` });
    if(player.isBanned()) return error(403, { error: `The player is already banned!` });
    if(player.admin) return error(403, { error: `You can't report admins!` });
    if(!player.tag) return error(404, { error: `This player does not have a tag!` });

    const reporterUuid = getUuidByJWT(authorization)!;
    if(reporterUuid == uuid) return error(403, { error: `You can't report yourself!` });
    if(player.reports.some((report) => report.by == reporterUuid && report.reportedName == player.tag)) return error(403, { error: `You already reported this player's tag!` });
    const { reason } = body;
    if(reason.trim() == ``) return error(422, { error: `You have to provide a valid reason!` });

    player.reports.push({
        by: reporterUuid || undefined,
        reportedName: player.tag,
        reason
    });
    await player.save();

    sendMessage({
        type: NotificationType.Report,
        uuid,
        reporterUuid,
        reason,
        tag: player.tag
    });
    return { message: `The player was successfully reported!` };
}, {
    detail: {
        tags: ['Interactions'],
        description: `Report another player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `You have tried to report someone whom you are not allowed to report.` }),
        404: t.Object({ error: t.String() }, { description: `The player you tried to report does not have a tag.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ reason: t.String({ minLength: 2, maxLength: 200, error: `Invalid reason.`, description: `Why do you want to report the player` }) }, { error: `Missing field "reason".` }),
    params: t.Object({ uuid: t.String({ description: `The UUID of the player you want to report` }) }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!`, description: `Your LabyConnect JWT` }) }, { error: `You're not authorized!` })
});