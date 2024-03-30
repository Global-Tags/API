import { Elysia } from "elysia";
import Logger from "./libs/Logger";
import * as config from "../config.json";
import { connect } from "./database/mongo";
import { readdirSync } from "fs";
import { join } from "path";

// Database connection
connect(config.srv);

// Elysia API
export const api = new Elysia({
    prefix: "/players/:uuid"
})
.onStart(() => Logger.info(`Elysia listening on port ${config.port}!`))
.listen(config.port);

loadRoutes();

async function loadRoutes() {
    const directory = join(__dirname, 'routes')
    for(const file of readdirSync(directory)) {
        const route: Elysia = (await import(join(directory, file))).default;
    
        api.use(route);
        Logger.info(`Loaded route /${file != `root.ts` ? file.slice(0, -3) : ``}`);
    }
}