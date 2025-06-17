import { ElysiaApp } from "..";
import { Report } from "../database/schemas/Report";
import { formatUUID } from "../libs/game-profiles";
import { Permission } from "../types/Permission";

// TODO: Add docs

export default (app: ElysiaApp) => app.get('/', async ({ session, status, i18n }) => {
    if(!session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const reports = await Report.find();

    return Promise.all(reports.map(async report => {
        const reported = await report.getReportedProfile();
        const reporter = await report.getReporterProfile();

        return {
            id: report.id,
            reported_player: {
                uuid: formatUUID(reported.uuid!),
                username: reported.username || 'Unknown username'
            },
            reporter: {
                uuid: formatUUID(reporter.uuid!),
                username: reporter.username || 'Unknown username'
            },
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
            created_at: report.created_at,
            last_updated: report.last_updated,
        };
    }));
}).get('/:id', async ({ session, params, status, i18n }) => {
    if(!session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const report = await Report.findOne({ id: params.id });
    if(!report) return status(404, { error: i18n('$.reports.not_found') });

    const reported = await report.getReportedProfile();
    const reporter = await report.getReporterProfile();

    return {
        id: report.id,
        reported_player: {
            uuid: formatUUID(reported.uuid!),
            username: reported.username
        },
        reporter: {
            uuid: formatUUID(reporter.uuid!),
            username: reporter.username
        },
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
        created_at: report.created_at,
        last_updated: report.last_updated,
    };
}) // TODO: Add route to manage report actions and status
.delete('/:id', async ({ session, params, status, i18n }) => {
    if(!session?.player?.hasPermission(Permission.DeleteReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const report = await Report.findOne({ id: params.id });
    if(!report) return status(404, { error: i18n('$.reports.not_found') });

    await report.deleteOne();

    return { message: i18n('$.reports.deleted') };
});