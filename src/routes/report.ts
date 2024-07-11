import Elysia, { t } from "elysia";
import { getUuidByJWT, getJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import { NotificationType, sendMessage } from "../libs/DiscordNotifier";
import fetchI18n from "../middleware/FetchI18n";

export default new Elysia({
    prefix: "/report"
}).use(fetchI18n).post(`/`, async ({ error, params, headers, body, i18n }) => { // Report player
    const uuid = params.uuid.replaceAll(`-`, ``);
    const { authorization } = headers;
    const session = await getJWTSession(authorization, uuid);
    if(!session.uuid) return error(403, { error: i18n(`error.notAllowed`) });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n(`error.playerNoTag`) });
    if(player.isBanned()) return error(403, { error: i18n(`ban.alreadyBanned`) });
    if(player.isAdmin()) return error(403, { error: i18n(`report.admin`) });
    if(!player.tag) return error(404, { error: i18n(`report.noTag`) });

    const reporterUuid = getUuidByJWT(authorization)!;
    const reporter = await players.findOneAndUpdate({ uuid: reporterUuid }, {
        $set: {
            uuid: reporterUuid
        }
    }, { upsert: true, new: true })!;
    if(reporter.isBanned()) return error(403, { error: i18n('error.banned') });
    if(reporter.uuid == uuid) return error(403, { error: i18n(`report.self`) });
    if(player.reports.some((report) => report.by == reporter.uuid && report.reportedName == player.tag)) return error(403, { error: i18n(`report.alreadyReported`) });
    const { reason } = body;
    if(reason.trim() == ``) return error(422, { error: i18n(`report.invalidReason`) });

    player.reports.push({
        by: reporter.uuid,
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
    return { message: i18n(`report.success`) };
}, {
    detail: {
        tags: ['Interactions'],
        description: `Report another player`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The player was successfully reported` }),
        403: t.Object({ error: t.String() }, { description: `You have tried to report someone whom you are not allowed to report.` }),
        404: t.Object({ error: t.String() }, { description: `The player you tried to report does not have a tag.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ reason: t.String({ minLength: 2, maxLength: 200, error: `report.validation;;[["min", "2"], ["max", "200"]]`, description: `Why do you want to report the player` }) }, { error: `error.invalidBody`, additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: `The UUID of the player you want to report` }) }),
    headers: t.Object({ authorization: t.String({ error: `error.notAllowed`, description: `Your LabyConnect JWT` }) }, { error: `error.notAllowed` })
});