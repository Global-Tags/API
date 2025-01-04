import { Context, Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Logger from "./libs/Logger";
import players from "./database/schemas/players";
import { connect as connectDatabase } from "./database/mongo";
import { getRouter } from "./libs/route-loader";
import { version } from "../package.json";
import access from "./middleware/access-log";
import checkDatabase from "./middleware/database-checker";
import Ratelimiter from "./libs/Ratelimiter";
import checkRatelimit from "./middleware/ratelimit-checker";
import { ip } from "./middleware/obtain-ip";
import { load as loadLanguages } from "./libs/i18n";
import fetchI18n, { getI18nFunctionByLanguage } from "./middleware/fetch-i18n";
import { getRequests, loadRequests } from "./libs/metrics";
import Metrics from "./database/schemas/metrics";
import AuthProvider from "./auth/AuthProvider";
import getAuthProvider from "./middleware/get-auth-provider";
import { handleErrors, initializeSentry } from "./libs/error-handler";
import minimist from "minimist";
import cors from "@elysiajs/cors";
import { verify as verifyMailOptions } from "./libs/mailer";
import { getLatestCommit, retrieveData } from "./libs/git-commit-data";
import { startEntitlementExpiry, startMetrics, startReferralReset, startRoleCacheJob } from "./libs/cron-jobs";
import { formatUUID } from "./routes/root";
import { config } from "./libs/config";

if(config.mongodb.trim().length == 0) {
    Logger.error('Database connection string is empty!');
    process.exit(1);
}

handleErrors();
if(config.sentry.enabled) initializeSentry(config.sentry.dsn);

export const args = minimist(process.argv.slice(2));
loadRequests();

retrieveData();

// Elysia API
export const elysia = new Elysia()
.onRequest(checkDatabase)
.onTransform(access)
.onBeforeHandle(checkRatelimit)
.use(ip({ checkHeaders: [config.ipHeader] }))
.use(cors())
.use(fetchI18n)
.use(getAuthProvider)
.use(swagger({
    path: '/docs',
    autoDarkMode: true,
    exclude: [
        '/docs',
        '/docs/json'
    ],
    documentation: {
        info: {
            version,
            title: 'GlobalTags API',
            description: 'This is the official GlobalTags API documentation containing detailed descriptions about the API endpoints and their usage.',
            license: {
                name: 'MIT',
                url: 'https://github.com/Global-Tags/API/blob/master/LICENSE'
            },
            contact: {
                name: 'RappyTV',
                url: 'https://www.rappytv.com',
                email: 'contact@rappytv.com'
            }
        },
        tags: [
            { name: 'API', description: 'Get info about the API' },
            { name: 'Interactions', description: 'Interact with other players' },
            { name: 'Settings', description: 'Modify the settings of your GlobalTag' },
            { name: 'Roles', description: 'Holds role management routes' },
            { name: 'Admin', description: 'Moderation actions' },
            { name: 'Connections', description: 'Manage account connections' }
        ]
    }
}))
.use(getRouter('/players/:uuid', __dirname))
.onStart(async () => {
    Logger.info(`Elysia listening on port ${config.port}!`);
    Ratelimiter.initialize();
    AuthProvider.loadProviders();
    loadLanguages();
    if(config.mailer.enabled) {
        verifyMailOptions();
    }
    await connectDatabase(config.mongodb);
    
    startRoleCacheJob();
    startEntitlementExpiry();
    startMetrics();
    startReferralReset();
})
.onError(({ code, set, error: { message: error }, request }) => {
    const i18n = getI18nFunctionByLanguage(request.headers.get('x-language'));

    if(code == 'VALIDATION') {
        set.status = 422;
        error = i18n(error);
        const errorParts = error.split(';;');
        error = i18n(errorParts[0]);
        if(errorParts.length > 1) {
            try {
                const args: string[][] = JSON.parse(errorParts[1]);
                for(const argument of args)
                    error = error.replaceAll(`<${argument[0]}>`, argument[1]);
            } catch(error) {
                Logger.error(`Failed to apply arguments "${errorParts[1]}": ${error}`);
            }
        }
        return { error: error.trim() };
    } else if(code == 'NOT_FOUND') {
        set.status = 404;
        return { error: i18n('error.notFound') };
    } else {
        set.status = 500;
        Logger.error(error);
        return { error: i18n('error.unknownError') };
    }
})
.get('/', () => ({
    version,
    requests: getRequests(),
    commit: {
        branch: config.github.branch,
        sha: getLatestCommit(),
        tree: getLatestCommit() ? `https://github.com/${config.github.owner}/${config.github.repository}/tree/${getLatestCommit()}` : null
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
.get('/ping', ({ error }: Context) => { return error(204, "") }, {
    detail: {
        tags: ['API'],
        description: 'Used by uptime checkers. This route is not being logged'
    },
    response: {
        204: t.Any({ description: 'The server is reachable' }),
        503: t.Object({ error: t.String() }, { description: 'Database is not reachable.' })
    }
})
.listen(config.port);
