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
import { Language, getLocales, getPath } from "./libs/I18n";

// Elysia API
export const elysia = new Elysia()
// .onRequest(checkDatabase)
.onTransform(access)
.onBeforeHandle(checkRatelimit)
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
.use(ip({ checkHeaders: config.ipHeaders }))
.use((app) => {
    return app.derive({ as: 'global' }, ({ headers }) => {
        const header = headers[`X-Minecraft-Language`] || `en-US`;
        const locales = getLocales(header);
        return {
            i18n: (path: string) => getPath(path, locales)
        };
    })
})
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
.onStart(() => {
    Logger.info(`Elysia listening on port ${config.port}!`);
    Ratelimiter.initialize();

    // connect(config.srv);
}).onError(({ code, set, error }) => {
    if(code == 'VALIDATION') {
        set.status = 422;
        return { error: error.message };
    } else if(code == 'NOT_FOUND') {
        set.status = 404;
        return { error: `Not Found` };
    } else {
        set.status = 500;
        Logger.error(error.message);
        return { error: `An unknown error ocurred! Please try again later` };
    }
})
.listen(config.port);