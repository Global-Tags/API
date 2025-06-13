import { Elysia, ValidationError } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Logger from "./libs/Logger";
import { connect as connectDatabase } from "./database/mongo";
import { getRouter } from "./libs/route-loader";
import { version } from "../package.json";
import access from "./middleware/access-log";
import checkDatabase from "./middleware/database-checker";
import Ratelimiter from "./libs/Ratelimiter";
import checkRatelimit from "./middleware/ratelimit-checker";
import { load as loadLanguages } from "./libs/i18n";
import fetchI18n, { getI18nFunctionByLanguage } from "./middleware/fetch-i18n";
import { loadRequests } from "./libs/metrics";
import AuthProvider from "./auth/AuthProvider";
import getAuthProvider from "./middleware/get-auth-provider";
import { handleErrors, initializeSentry } from "./libs/error-handler";
import minimist from "minimist";
import cors from "@elysiajs/cors";
import { verify as verifyMailOptions } from "./libs/mailer";
import { startEntitlementExpiry, startMetrics, startReferralReset, startRoleCacheJob, startRoleSynchronization } from "./libs/cron-jobs";
import { config } from "./libs/config";
import { join } from "path";
import ip from "./middleware/ip";
import { generateSecureCode } from "./routes/players/[uuid]/connections";
import { captureException } from "@sentry/bun";
import { validateKeypair } from "./libs/jwt";

if(config.mongodb.trim().length == 0) {
    Logger.error('Database connection string is empty!');
    process.exit(1);
}

handleErrors();
if(config.sentry.enabled) initializeSentry(config.sentry.dsn);

export const args = minimist(process.argv.slice(2));
loadRequests();

// Elysia API
const elysia = new Elysia()
    .onRequest(checkDatabase)
    .onTransform(access)
    .onBeforeHandle(checkRatelimit)
    .use(ip)
    .use(cors())
    .use(fetchI18n)
    .use(getAuthProvider)
    .use(getRouter(join(__dirname, 'routes')))
    .use(swagger({
        path: '/docs',
        autoDarkMode: true,
        exclude: [
            '/docs',
            '/docs/json'
        ],
        documentation: {
            info: {
                version,
                title: 'GlobalTags API',
                description: 'This is the official GlobalTags API documentation containing detailed descriptions about the API endpoints and their usage.',
                license: {
                    name: 'MIT',
                    url: 'https://github.com/Global-Tags/API/blob/master/LICENSE'
                },
                contact: {
                    name: 'RappyTV',
                    url: 'https://www.rappytv.com',
                    email: 'contact@rappytv.com'
                }
            },
            tags: [
                { name: 'API', description: 'Get info about the API' },
                { name: 'Interactions', description: 'Interact with other players' },
                { name: 'Settings', description: 'Modify the settings of your GlobalTag' },
                { name: 'Roles', description: 'Holds role management routes' },
                { name: 'Gift codes', description: 'Holds gift code actions' },
                { name: 'Admin', description: 'Admininstrative actions' },
                { name: 'Connections', description: 'Manage account connections' }
            ]
        }
    }))
    .onStart(async () => {
        Logger.info(`Elysia listening on port ${config.port}!`);
        Ratelimiter.initialize();
        AuthProvider.loadProviders();
        loadLanguages();
        if(config.mailer.enabled) {
            verifyMailOptions();
        }
        await connectDatabase(config.mongodb);
        
        validateKeypair();
        startRoleCacheJob();
        startEntitlementExpiry();
        startRoleSynchronization();
        startMetrics();
        startReferralReset();
    })
    .onError(({ code, set, error, request }) => {
        const i18n = getI18nFunctionByLanguage(request.headers.get('x-language') || undefined);

        if(code == 'VALIDATION') {
            set.status = 422;
            error = error as ValidationError;
            let errorMessage = i18n(error.message);
            const errorParts = errorMessage.split(';;');
            errorMessage = i18n(errorParts[0]);
            if(errorParts.length > 1) {
                try {
                    const args: string[][] = JSON.parse(errorParts[1]);
                    for(const argument of args)
                        errorMessage = errorMessage.replaceAll(`<${argument[0]}>`, argument[1]);
                } catch(error) {
                    captureException(error);
                    Logger.error(`Failed to apply arguments "${errorParts[1]}": ${error}`);
                }
            }
            return { error: errorMessage.trim() };
        } else if(code == 'NOT_FOUND') {
            set.status = 404;
            return { error: i18n('error.notFound') };
        } else {
            set.status = 500;
            captureException(error);
            const requestId = generateSecureCode(32);
            Logger.error(`An error ocurred with request ${requestId}: ${error}`);
            return { error: i18n('error.unknownError'), id: requestId };
        }
    })
    .listen({ port: config.port, idleTimeout: 20 });

export type ElysiaApp = typeof elysia;