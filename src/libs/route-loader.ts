import Elysia from "elysia";
import { lstatSync, readdirSync } from "fs";
import { join, basename, extname } from "path";
import Logger from "./Logger";

export async function getRouter(dirname: string) {
    const app = new Elysia();
    await loadRoutes(app, dirname, '');
    return app;
}

function toElysiaParam(segment: string): string {
    return segment.replace(/\[(\w+)\]/g, ':$1');
}

async function loadRoutes(app: Elysia, directory: string, prefix: string) {
    const entries = readdirSync(directory);

    const dirs = entries.filter((entry) => lstatSync(join(directory, entry)).isDirectory());
    const files = entries.filter((entry) => !lstatSync(join(directory, entry)).isDirectory());

    const router = new Elysia({ prefix: toElysiaParam(prefix) });

    for (const file of files) {
        const ext = extname(file);
        if (ext !== '.ts') continue;

        const name = basename(file, ext);
        const isIndex = name === 'index';
        const routePrefix = isIndex ? undefined : `/${toElysiaParam(name)}`;

        const route = new Elysia({ prefix: routePrefix });

        const mod = require(join(directory, file));

        if (typeof mod.default !== 'function') {
            Logger.warn(`Skipping ${join(directory, file)}: no default export function`);
            continue;
        }

        const configured = mod.default(route);
        router.use(configured ?? route);

        Logger.debug(`Loaded route: ${toElysiaParam(prefix)}${routePrefix ?? '/'}`);
    }

    app.use(router);

    for (const subdir of dirs) {
        await loadRoutes(
            app,
            join(directory, subdir),
            `${prefix}/${toElysiaParam(subdir)}`.replace(/\/+/g, '/')
        );
    }
}