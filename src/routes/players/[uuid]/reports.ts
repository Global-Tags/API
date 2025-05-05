import { t } from "elysia";
import players, { getOrCreatePlayer } from "../../../database/schemas/players";
import { Permission } from "../../../types/Permission";
import { ModLogType, sendModLogMessage, sendReportMessage } from "../../../libs/discord-notifier";
import { formatUUID, GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, error }) => { // Get reports
    if(!session?.hasPermission(Permission.ManageReports)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return error(404, { error: i18n('error.playerNotFound') });

    return player.reports.map((report) => ({
        id: report.id,
        reportedTag: report.reported_tag,
        by: formatUUID(report.by),
        reason: report.reason,
        createdAt: report.created_at.getTime()
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns all player reports'
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), reportedTag: t.String(), by: t.String(), reason: t.String(), createdAt: t.Number() }), { description: 'The reports of the player' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage reports' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the reports of' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/', async ({ session, body: { reason }, params, i18n, error }) => { // Report player
    const uuid = stripUUID(params.uuid);
    if(!session?.uuid) return error(403, { error: i18n('error.notAllowed') });

    if(session.equal) return error(403, { error: i18n('report.self') });
    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: i18n('error.playerNoTag') });
    if(player.isBanned()) return error(403, { error: i18n('ban.already_banned') });
    if(player.hasPermission(Permission.ReportImmunity)) return error(403, { error: i18n('report.immune') });
    if(!player.tag) return error(404, { error: i18n('report.noTag') });

    const reporter = await getOrCreatePlayer(session.uuid);
    if(reporter.isBanned()) return error(403, { error: i18n('error.banned') });
    if(player.reports.some((report) => report.by == reporter.uuid && report.reported_tag == player.tag)) return error(409, { error: i18n('report.alreadyReported') });
    if(reason.trim() == '') return error(422, { error: i18n('report.invalidReason') });

    player.createReport({
        by: reporter.uuid,
        reported_tag: player.tag,
        reason
    });
    await player.save();

    sendReportMessage({
        player: await player.getGameProfile(),
        reporter: await reporter.getGameProfile(),
        tag: player.tag,
        reason
    });
    return { message: i18n('report.success') };
}, {
    detail: {
        tags: ['Interactions'],
        description: 'Reports another player'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The player was successfully reported' }),
        403: t.Object({ error: t.String() }, { description: 'You are not authorized to report this player' }),
        404: t.Object({ error: t.String() }, { description: 'The player does not have a tag' }),
        409: t.Object({ error: t.String() }, { description: 'You already reported that tag' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ reason: t.String({ minLength: 2, maxLength: 200, error: 'report.validation;;[["min", "2"], ["max", "200"]]', description: 'The report reason' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to report' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete(`/:id`, async ({ session, params: { uuid, id }, i18n, error }) => { // Delete report
    if(!session?.hasPermission(Permission.ManageReports)) return error(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(uuid) });
    if(!player) return error(404, { error: i18n(`error.playerNotFound`) });

    const report = player.reports.find((report) => report.id == id.trim());
    if(!report) return error(404, { error: i18n(`report.delete.not_found`) });

    player.deleteReport(report.id);
    await player.save();

    sendModLogMessage({
        logType: ModLogType.DeleteReport,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await player.getGameProfile(),
        discord: false,
        report: `\`${report.reason}\` (\`#${report.id}\`)`
    });

    return { message: i18n(`report.delete.success`) };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Deletes a specific player report'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The report was deleted' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage reports' }),
        404: t.Object({ error: t.String() }, { description: 'The player or the report was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The report ID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});;