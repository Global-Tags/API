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
    prefix = prefix.replace(/\[(\w+)\]/g, ':$1');
    const elysia = new Elysia({ prefix });
    for(const file of readdirSync(dirname)) {
        if(lstatSync(join(dirname, file)).isDirectory()) {
            await getRoutes(app, `${prefix}/${file}`, join(dirname, file));
            continue;
        }
        const root = file == 'index.ts';
        const route = new Elysia({ prefix: root ? undefined : file.slice(0, -3) });
        (await import(join(dirname, file))).default(route);
        elysia.use(route);

        Logger.debug(`Loaded route ${prefix}/${route.config.prefix || ''}`);
    }
    app.use(elysia);
}