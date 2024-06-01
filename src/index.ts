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

// Elysia API
export const elysia = new Elysia()
.onRequest(checkDatabase)
.onTransform(access)
.onBeforeHandle(checkRatelimit)
.use(ip({ checkHeaders: config.ipHeaders }))
.use(fetchI18n)
.use(swagger({
    path: '/docs',
    autoDarkMode: true,
    exclude: [
        `/players/{uuid}/ban/`,
        `/docs`,
        `/docs/json`
    ],
    documentation: {
        info: {
            version,
            title: `GlobalTags API`,
            description: `This documentation is for the API of the GlobalTags addon for the LabyMod Minecraft client.`,
            contact: {
                name: `RappyTV`,
                url: `https://www.rappytv.com`,
                email: `contact@rappytv.com`
            }
        },
        tags: [
            { name: `API`, description: `Get info about the API` },
            { name: `Interactions`, description: `Interact with other players` },
            { name: `Settings`, description: `Modify the settings of your global tag` }
        ]
    }
}))
.use(getRouter(`/players/:uuid`, __dirname))
.get(`/`, ({ i18n }) => ({ version: i18n(`error.premiumAccount`) }), {
    detail: {
        tags: [`API`],
        description: `Returns the API version. Used by the /gt command of the addon.`
    },
    response: {
        200: t.Object({ version: t.String() }, { description: `You received the version` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    }
})
.get(`/metrics`, async () => {
    const metrics = await Metrics.find();

    return metrics.map((metric) => ({
        time: new Date(metric.createdAt).getTime(),
        users: metric.players,
        tags: metric.tags,
        admins: metric.admins,
        bans: metric.bans,
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
    }
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
.onStart(() => {
    Logger.info(`Elysia listening on port ${config.port}!`);
    Ratelimiter.initialize();
    initializeMetrics();
    
    // Load languages
    load(false);
    new CronJob(`0 */6 * * *`, () => load(true), null, true);

    connect(config.srv);
}).onError(({ code, set, error: { message: error }, request }) => {
    const i18n = getI18nFunctionByLanguage(request.headers.get('x-minecraft-language') || 'en_us');

    if(code == 'VALIDATION') {
        set.status = 422;
        error = i18n(error);
        const argText = error.split(';;')[1];
        if(argText) {
            try {
                const args: string[][] = JSON.parse(argText);
                for(const argument of args)
                    error = error.replaceAll(`<${argument[0]}>`, argument[1]);
            } catch {}
        }
        return { error };
    } else if(code == 'NOT_FOUND') {
        set.status = 404;
        return { error: i18n(`error.notFound`) };
    } else {
        set.status = 500;
        Logger.error(error);
        return { error: i18n(`error.unknownError`) };
    }
})
.listen(config.port);