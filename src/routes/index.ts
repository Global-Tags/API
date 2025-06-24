import { ElysiaApp } from "..";
import { getRequests } from "../libs/metrics";
import { Context, t } from "elysia";
import { formatUUID } from "../libs/game-profiles";
import { Metric } from "../database/schemas/Metric";
import { Player } from "../database/schemas/Player";
import { tResponseBody, tSchema } from "../libs/models";
import { config } from "../libs/config";
import { DocumentationCategory } from "../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', () => ({
    version: config.version,
    requests: getRequests()
}), {
    detail: {
        tags: [DocumentationCategory.Api],
        description: 'Get API information'
    },
    response: {
        200: tResponseBody.ApiInfo
    }
}).get('/metrics', async ({ query: { latest } }) => {
    const metrics = await Metric.find();

    return metrics.filter((doc) => {
        if(latest != 'true') return true;
        return doc.id == (metrics.at(-1)?.id ?? 0);
    }).map((metric) => ({
        time: metric.created_at.getTime(),
        users: metric.players,
        tags: metric.tags,
        admins: metric.admins,
        bans: metric.bans,
        downloads: metric.downloads,
        ratings: metric.ratings,
        daily_requests: metric.daily_requests ?? 0,
        positions: metric.positions,
        icons: metric.icons
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Api],
        description: 'Get API statistics'
    },
    response: {
        200: t.Array(tSchema.Metric, { description: 'A metric list' })
    },
    query: t.Object({
        latest: t.Optional(t.String({ error: '$.error.wrongType;;[["field", "element"], ["type", "string"]]' }))
    }, { additionalProperties: true })
}).get('/referrals', async () => {
    const data = await Player.find();
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
        tags: [DocumentationCategory.Referrals],
        description: 'Get the referral leaderboards'
    },
    response: {
        200: t.Object({
            total: t.Array(t.Object({ uuid: t.String(), total_referrals: t.Number(), current_month_referrals: t.Number() })),
            current_month: t.Array(t.Object({ uuid: t.String(), total_referrals: t.Number(), current_month_referrals: t.Number() }))
        }, { description: 'The referral leaderboards' })
    }
}).get('/ping', ({ status }: Context) => { return status(204, '') }, {
    detail: {
        tags: [DocumentationCategory.Api],
        description: 'Check the status of the API. This route is not being logged'
    },
    response: {
        204: t.Any({ description: 'Empty response' })
    }
});