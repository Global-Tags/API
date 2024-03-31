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
import { ip } from "elysia-ip";

// Elysia API
export const api = new Elysia()
.onRequest(checkDatabase)
.onTransform(access)
.onBeforeHandle(checkRatelimit)
.get(`/`, () => ({ version }))
.get(`/ping`, ({ error }: Context) => { return error(204, "") })
.use(ip())
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
})
.listen(config.port);