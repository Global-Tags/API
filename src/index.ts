import { Context, Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Logger from "./libs/Logger";
import { connect } from "./database/mongo";
import { getRouter } from "./libs/RouteLoader";
import * as config from "../config.json";
import { version } from "../package.json";
import access from "./middleware/AccessLog";
import checkDatabase from "./middleware/DatabaseChecker";
import Ratelimiter from "./libs/Ratelimiter";
import checkRatelimit from "./middleware/RatelimitChecker";
import { ip } from "./middleware/ObtainIP";
import { load } from "./libs/I18n";
import { CronJob } from "cron";
import fetchI18n, { getI18nFunctionByLanguage } from "./middleware/FetchI18n";
import { initializeMetrics } from "./libs/Metrics";
import Metrics from "./database/schemas/metrics";
import handleErrors from "./libs/ErrorHandler";
import { verifyVersion } from "./middleware/VersionVerification";
import AuthProvider from "./auth/AuthProvider";
import getAuthProvider from "./middleware/GetAuthProvider";

handleErrors();

// Elysia API
export const elysia = new Elysia()
.onRequest(checkDatabase)
.onRequest(verifyVersion)
.onTransform(access)
.onBeforeHandle(checkRatelimit)
.use(ip({ checkHeaders: config.ipHeaders }))
.use(fetchI18n)
.use(getAuthProvider)
.use(swagger({
    path: '/docs',
    autoDarkMode: true,
    exclude: [
        `/docs`,
        `/docs/json`
    ],
    documentation: {
        info: {
            version,
            title: `GlobalTags API`,
            description: `This documentation is for the API of the GlobalTags addon for the LabyMod Minecraft client.`,
            license: {
                name: 'MIT',
                url: 'https://github.com/RappyLabyAddons/GlobalTagAPI/blob/master/LICENSE'
            },
            contact: {
                name: `RappyTV`,
                url: `https://www.rappytv.com`,
                email: `contact@rappytv.com`
            }
        },
        tags: [
            { name: `API`, description: `Get info about the API` },
            { name: `Interactions`, description: `Interact with other players` },
            { name: `Settings`, description: `Modify the settings of your global tag` },
            { name: `Admin`, description: `Moderation actions` },
            { name: `Connections`, description: `Manage account connections` }
        ]
    }
}))
.use(getRouter(`/players/:uuid`, __dirname))
.onStart(() => {
    Logger.info(`Elysia listening on port ${config.port}!`);
    Ratelimiter.initialize();
    AuthProvider.loadProviders();
    initializeMetrics();
    
    // Load languages
    load();
    new CronJob(`0 */6 * * *`, () => load(true), null, true);

    connect(config.srv);
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
        return { error: i18n(`error.notFound`) };
    } else {
        set.status = 500;
        Logger.error(error);
        return { error: i18n(`error.unknownError`) };
    }
})
.get(`/`, () => ({ version }), {
    detail: {
        tags: [`API`],
        description: `Returns the API version. Used by the /gt command of the addon.`
    },
    response: {
        200: t.Object({ version: t.String() }, { description: `You received the version` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    }
})
.get(`/metrics`, async ({ query: { latest }}) => {
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
        rating: metric.rating,
        positions: metric.positions,
        icons: metric.icons
    }));
}, {
    detail: {
        tags: [`API`],
        description: `Get API statistics`
    },
    response: {
        200: t.Array(t.Object({
            time: t.Number({ default: Date.now() }),
            users: t.Number(),
            tags: t.Number(),
            admins: t.Number(),
            bans: t.Number(),
            positions: t.Object({}, { default: {}, additionalProperties: true, description: 'All position counts' }),
            icons: t.Object({}, { default: {}, additionalProperties: true, description: 'All icon counts' })
        }, { description: `The server is reachable` })),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    query: t.Object({
        latest: t.Optional(t.String({ error: 'error.wrongType;;[["field", "element"], ["type", "string"]]' }))
    }, { additionalProperties: true })
})
.get(`/ping`, ({ error }: Context) => { return error(204, "") }, {
    detail: {
        tags: [`API`],
        description: `Used by uptime checkers. This route is not being logged`
    },
    response: {
        204: t.Any({ description: `The server is reachable` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    }
})
.listen(config.port);