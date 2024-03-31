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
    if(reporterUuid == uuid) return error(400, { error: `You can't report yourself!` });
    if(player.reports.some((report) => report.by == reporterUuid && report.reportedName == player.tag)) return error(400, { error: `You already reported this player's tag!` });
    const { reason } = body;
    if(!reason || typeof reason != 'string' || reason.trim() == ``) return error(400, { error: `You have to provide a valid reason!` });

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
    body: t.Object({ reason: t.String() }),
    params: t.Object({ uuid: t.String() }),
    headers: t.Object({ authorization: t.String() })
});