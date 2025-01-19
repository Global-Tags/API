import { ElysiaApp } from "..";
import { getRequests } from "../libs/metrics";
import { version } from "../../package.json";
import { Context, t } from "elysia";
import Metrics from "../database/schemas/metrics";
import { formatUUID } from "../libs/game-profiles";
import players from "../database/schemas/players";

export default (app: ElysiaApp) => app.get('/', () => ({
    version,
    requests: getRequests(),
    commit: {
        branch: 'deprecated',
        sha: 'deprecated',
        tree: 'deprecated'
    }
}), {
    detail: {
        tags: ['API'],
        description: 'Returns some basic info about the API.'
    },
    response: {
        200: t.Object({ version: t.String(), requests: t.Number(), commit: t.Object({ branch: t.String(), sha: t.Union([t.String(), t.Null()]), tree: t.Union([t.String(), t.Null()]) }) }, { description: 'Some basic API info' }),
        503: t.Object({ error: t.String() }, { description: 'Database is not reachable.' })
    }
})
.get('/metrics', async ({ query: { latest } }) => {
    const metrics = await Metrics.find();

    return metrics.filter((doc) => {
        if(latest != 'true') return true;
        return doc.id == (metrics.at(-1)?.id ?? 0);
    }).map((metric) => ({
        time: new Date(metric.createdAt).getTime(),
        users: metric.players,
        tags: metric.tags,
        admins: metric.admins,
        bans: metric.bans,
        downloads: metric.downloads,
        ratings: metric.ratings,
        dailyRequests: metric.dailyRequests ?? 0,
        positions: metric.positions,
        icons: metric.icons
    }));
}, {
    detail: {
        tags: ['API'],
        description: 'Get API statistics'
    },
    response: {
        200: t.Array(t.Object({
            time: t.Number({ default: Date.now() }),
            users: t.Number(),
            tags: t.Number(),
            admins: t.Number(),
            bans: t.Number(),
            downloads: t.Object({ flintmc: t.Number(), modrinth: t.Number() }, { additionalProperties: true }),
            ratings: t.Object({ flintmc: t.Number() }, { additionalProperties: true }),
            dailyRequests: t.Number(),
            positions: t.Object({}, { default: {}, additionalProperties: true, description: 'All position counts' }),
            icons: t.Object({}, { default: {}, additionalProperties: true, description: 'All icon counts' })
        }, { description: 'The server is reachable' })),
        503: t.Object({ error: t.String() }, { description: 'Database is not reachable.' })
    },
    query: t.Object({
        latest: t.Optional(t.String({ error: 'error.wrongType;;[["field", "element"], ["type", "string"]]' }))
    }, { additionalProperties: true })
}).get('/referrals', async () => {
    const data = await players.find();
    const totalReferrals = data.filter((player) => player.referrals.total.length > 0).sort((a, b) => b.referrals.total.length - a.referrals.total.length).slice(0, 10);
    const monthReferrals = data.filter((player) => player.referrals.current_month > 0).sort((a, b) => b.referrals.current_month - a.referrals.current_month).slice(0, 10);

    return {
        total: totalReferrals.map((player) => ({
            uuid: formatUUID(player.uuid),
            total_referrals: player.referrals.total.length,
            current_month_referrals: player.referrals.current_month
        })),
        current_month: monthReferrals.map((player) => ({
            uuid: formatUUID(player.uuid),
            total_referrals: player.referrals.total.length,
            current_month_referrals: player.referrals.current_month
        }))
    };
}, {
    detail: {
        tags: ['API'],
        description: 'Get the referral leaderboard'
    },
    response: {
        200: t.Object({
            total: t.Array(t.Object({ uuid: t.String(), total_referrals: t.Number(), current_month_referrals: t.Number() })),
            current_month: t.Array(t.Object({ uuid: t.String(), total_referrals: t.Number(), current_month_referrals: t.Number() }))
        }, { description: 'The referral leaderboards.' }),
        503: t.Object({ error: t.String() }, { description: 'Database is not reachable.' })
    }
})
.get('/ping', ({ error }: Context) => { return error(204, '') }, {
    detail: {
        tags: ['API'],
        description: 'Used by uptime checkers. This route is not being logged'
    },
    response: {
        204: t.Any({ description: 'The server is reachable' }),
        503: t.Object({ error: t.String() }, { description: 'Database is not reachable.' })
    }
})