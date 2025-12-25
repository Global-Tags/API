import { t } from "elysia";
import { getOrCreatePlayer, Player } from "../../../database/schemas/Player";
import { Permission } from "../../../types/Permission";
import { sendReportMessage } from "../../../libs/discord-notifier";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Report } from "../../../database/schemas/Report";
import { tResponseBody, tHeaders, tParams, tRequestBody, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get player made reports
    if(!session?.self && !session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const reports = await Report.find({ reporter_uuid: player.uuid });

    return reports.map(report => ({
        id: report.id,
        reported_uuid: report.reported_uuid,
        reporter_uuid: report.reporter_uuid,
        reason: report.reason,
        context: report.context,
        is_resolved: report.isResolved(),
        created_at: report.created_at.getTime(),
        last_updated: report.last_updated.getTime(),
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Reports],
        description: 'Get all player reports'
    },
    response: {
        200: t.Array(tSchema.Report, { description: 'A report list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
}).get('/:id', async ({ session, params, i18n, status }) => { // Get player made reports
    if(!session?.self && !session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const report = await Report.findOne({ id: params.id, reporter_uuid: player.uuid });
    if(!report) return status(404, { error: i18n('$.reports.not_found') });

    return {
        id: report.id,
        reported_uuid: report.reported_uuid,
        reporter_uuid: report.reporter_uuid,
        reason: report.reason,
        context: report.context,
        is_resolved: report.isResolved(),
        created_at: report.created_at.getTime(),
        last_updated: report.last_updated.getTime(),
    };
}, {
    detail: {
        tags: [DocumentationCategory.Reports],
        description: 'Get a single player report'
    },
    response: {
        200: tSchema.Report,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndReportId,
    headers: tHeaders
}).post('/', async ({ session, body: { reason }, params, i18n, status }) => { // Report player
    if(!session?.player) return status(403, { error: i18n('$.error.notAllowed') });
    if(session.self) return status(403, { error: i18n('$.report.self') });

    reason = reason.trim();
    if(reason.length < 2 || reason.length > 200) return status(422, { error: i18n('$.error.invalid_reason').replace('<min>', '2').replace('<max>', '200') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNoTag') });
    if(player.isBanned()) return status(403, { error: i18n('$.ban.already_banned') });
    if(player.hasPermission(Permission.ReportImmunity)) return status(403, { error: i18n('$.report.immune') });
    if(!player.tag) return status(404, { error: i18n('$.error.playerNoTag') });

    const reporter = await getOrCreatePlayer(session.uuid!);
    if(reporter.isBanned()) return status(403, { error: i18n('$.error.banned') });
    if(await Report.exists({ reporter_uuid: reporter.uuid, 'context.tag': player.tag })) return status(409, { error: i18n('$.report.alreadyReported') });

    const report = await player.createReport(reporter.uuid, reason);

    sendReportMessage({
        player: await player.getGameProfile(),
        reporter: await reporter.getGameProfile(),
        report
    });

    return {
        id: report.id,
        reported_uuid: report.reported_uuid,
        reporter_uuid: report.reporter_uuid,
        reason: report.reason,
        context: report.context,
        is_resolved: report.isResolved(),
        created_at: report.created_at.getTime(),
        last_updated: report.last_updated.getTime(),
    };
}, {
    detail: {
        tags: [DocumentationCategory.Reports],
        description: 'Report another player'
    },
    response: {
        200: tSchema.Report,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.Report,
    params: tParams.uuid,
    headers: tHeaders
});