import Elysia from "elysia";
import { readdirSync } from "fs";
import { join } from "path";
import Logger from "./Logger";

export async function getRouter(prefix: string, dirname: string) {
    const app = new Elysia({ prefix });
    const directory = join(dirname, 'routes')
    for(const file of readdirSync(directory)) {
        const route: Elysia = (await import(join(directory, file))).default;
    
        app.use(route);
        Logger.debug(`Loaded route ${prefix}/${file != `root.ts` ? file.slice(0, -3) : ``}`);
    }

    return app;
}