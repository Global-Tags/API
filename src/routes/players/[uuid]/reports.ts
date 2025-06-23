import { t } from "elysia";
import { getOrCreatePlayer, Player } from "../../../database/schemas/Player";
import { Permission } from "../../../types/Permission";
import { sendReportMessage } from "../../../libs/discord-notifier";
import { formatUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Report } from "../../../database/schemas/Report";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get player made reports
    if(!session?.self && !session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const reports = await Report.find({ reporter_uuid: player.uuid });

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
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: 'Get all player reports'
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), reported_player: t.Object({ uuid: t.String(), username: t.String() }), reporter: t.Object({ uuid: t.String(), username: t.String() }), reason: t.String(), context: t.Object({ tag: t.String(), position: t.String(), icon: t.Object({ type: t.String(), hash: t.Nullable(t.String()) }) }), is_resolved: t.Boolean(), created_at: t.Number(), last_updated: t.Number() }), { description: 'The reports of the player' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage reports' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the reports of' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).get('/:id', async ({ session, params, i18n, status }) => { // Get player made reports
    if(!session?.self && !session?.player?.hasPermission(Permission.ViewReports)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const report = await Report.findOne({ id: params.id, reporter_uuid: player.uuid });
    if(!report) return status(404, { error: i18n('$.reports.not_found') });

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
        tags: ['Admin'],
        description: 'Get a single player report'
    },
    response: {
        200: t.Object({ id: t.String(), reported_player: t.Object({ uuid: t.String(), username: t.String() }), reporter: t.Object({ uuid: t.String(), username: t.String() }), reason: t.String(), context: t.Object({ tag: t.String(), position: t.String(), icon: t.Object({ type: t.String(), hash: t.Nullable(t.String()) }) }), is_resolved: t.Boolean(), created_at: t.Number(), last_updated: t.Number() }, { description: 'The report object' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage reports' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to get the reports of' }), id: t.String({ description: 'The report ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).post('/', async ({ session, body: { reason }, params, i18n, status }) => { // Report player
    if(!session?.player) return status(403, { error: i18n('$.error.notAllowed') });

    if(session.self) return status(403, { error: i18n('$.report.self') });
    if(reason.trim() == '') return status(422, { error: i18n('$.report.invalidReason') });
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
    return { message: i18n('$.report.success').replace('<id>', report.id) };
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
    body: t.Object({ reason: t.String({ minLength: 2, maxLength: 200, error: '$.report.validation;;[["min", "2"], ["max", "200"]]', description: 'The report reason' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The UUID of the player you want to report' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});