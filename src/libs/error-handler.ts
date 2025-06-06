import * as Sentry from "@sentry/bun";
import Logger from "./Logger";
import { version } from "../../package.json";

export function handleErrors() {
    Logger.debug('Exception handler initialized.');
    process.on('unhandledRejection', (reason) => Logger.error(`Unhandled rejection for reason "${reason}"`));
    process.on('uncaughtException', (error) => Logger.error(`Unhandled exception: "${error}"`));
}

export function initializeSentry(dsn: string) {
    Logger.info('Initializing Sentry...');
    Sentry.init({
        dsn,
        release: version
    })
    Logger.info('Initialized Sentry!');
}