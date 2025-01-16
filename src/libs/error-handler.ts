import * as Sentry from "@sentry/bun";
import Logger from "./Logger";
import { version } from "../../package.json";

export function handleErrors() {
    Logger.debug('Exception handler initialized.');
    process.on('unhandledRejection', (reason, promise) => Logger.error(`Unhandled rejection at: "${promise}". Reason: "${reason}"`));
    process.on('uncaughtException', (error) => Logger.error(`Unhandled exception: "${error}"`));
}

export function initializeSentry(dsn: string) {
    Logger.info('Initializing Sentry...');
    const client = new Sentry.BunClient({
        dsn,
        tracesSampleRate: 1.0,
        stackParser: Sentry.defaultStackParser,
        transport: Sentry.makeFetchTransport,
        integrations: [
            Sentry.onUnhandledRejectionIntegration({ mode: 'none' }),
            Sentry.onUncaughtExceptionIntegration(),
            Sentry.mongooseIntegration(),
            Sentry.fsIntegration(),
        ],
        release: version
    });

    Sentry.setCurrentClient(client);
    client.init();
    Logger.info('Initialized Sentry!');
}