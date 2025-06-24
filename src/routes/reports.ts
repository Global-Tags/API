import { t } from "elysia";
import { ElysiaApp } from "..";
import { Report } from "../database/schemas/Report";
import { formatUUID } from "../libs/game-profiles";
import { tHeaders, tParams, tResponseBody, tSchema } from "../libs/models";
import { Permission } from "../types/Permission";
import { DocumentationCategory } from "../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, status, i18n }) => {
    if(!session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const reports = await Report.find();

    return reports.map(report => ({
        id: report.id,
        reported_uuid: formatUUID(report.reported_uuid),
        reporter_uuid: formatUUID(report.reporter_uuid),
        reason: report.reason,
        actions: report.actions.length,
        context: {
            tag: report.context.tag,
            position: report.context.position,
            icon: {
                type: report.context.icon.type,
                hash: report.context.icon.hash
            }
        },
        is_resolved: report.isResolved(),
        created_at: report.created_at.getTime(),
        last_updated: report.last_updated.getTime()
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Reports],
        description: 'Get a specific report'
    },
    response: {
        200: t.Array(tSchema.Report, { description: 'A report list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.reportId,
    headers: tHeaders
}).get('/:id', async ({ session, params, status, i18n }) => {
    if(!session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const report = await Report.findOne({ id: params.id });
    if(!report) return status(404, { error: i18n('$.reports.not_found') });

    return {
        id: report.id,
        reported_uuid: formatUUID(report.reported_uuid),
        reporter_uuid: formatUUID(report.reporter_uuid),
        reason: report.reason,
        actions: report.actions.map(action => ({
            user: action.user,
            type: action.type,
            comment: action.comment,
            added_at: action.added_at
        })),
        context: {
            tag: report.context.tag,
            position: report.context.position,
            icon: {
                type: report.context.icon.type,
                hash: report.context.icon.hash
            }
        },
        is_resolved: report.isResolved(),
        created_at: report.created_at.getTime(),
        last_updated: report.last_updated.getTime(),
    };
}, {
    detail: {
        tags: [DocumentationCategory.Reports],
        description: 'Get a specific report'
    },
    response: {
        200: tSchema.Report,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.reportId,
    headers: tHeaders
}) // TODO: Add route to manage report actions and status
.delete('/:id', async ({ session, params, status, i18n }) => {
    if(!session?.player?.hasPermission(Permission.DeleteReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const report = await Report.findOne({ id: params.id });
    if(!report) return status(404, { error: i18n('$.reports.not_found') });

    await report.deleteOne();

    return { message: i18n('$.reports.deleted') };
}, {
    detail: {
        tags: [DocumentationCategory.Reports],
        description: 'Delete a report'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.reportId,
    headers: tHeaders
});