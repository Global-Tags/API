import Elysia from "elysia";
import { lstatSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "./Logger";

export async function getRouter(dirname: string) {
    const app = new Elysia();
    await getRoutes(app, '', dirname);

    return app;
}

async function getRoutes(app: Elysia, prefix: string, dirname: string) {
    const elysia = new Elysia({ prefix });
    for(const file of readdirSync(dirname)) {
        if(lstatSync(join(dirname, file)).isDirectory()) {
            await getRoutes(app, `${prefix}/${file}`, join(dirname, file));
            continue;
        }
        const route: Elysia = (await import(join(dirname, file))).default;

        elysia.use(route);
        Logger.debug(`Loaded route ${prefix}/${file != `root.ts` ? file.slice(0, -3) : ``}`);
    }
    app.use(elysia);
}