import { Context, Elysia } from "elysia";
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

// Elysia API
export const api = new Elysia()
.onRequest(checkDatabase)
.onTransform(access)
.onBeforeHandle(checkRatelimit)
.get(`/`, () => ({ version }))
.get(`/ping`, ({ error }: Context) => { return error(204, "") })
.use(ip({ checkHeaders: ['x-real-ip'] }))
.use(swagger({
    autoDarkMode: true,
    swaggerOptions: {
        tryItOutEnabled: false
    },
    exclude: [
        `/players/{uuid}/ban/`
    ],
    documentation: {
        info: {
            version,
            title: `GlobalTags LabyMod Addon API`,
            contact: {
                name: `RappyTV`,
                url: `https://www.rappytv.com`,
                email: `contact@rappytv.com`
            }
        }
    }
}))
.use(getRouter(`/players/:uuid`, __dirname))
.onStart(() => {
    Logger.info(`Elysia listening on port ${config.port}!`);
    Ratelimiter.initialize();

    connect(config.srv);
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