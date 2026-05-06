import { Elysia, ValidationError } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Logger from "./libs/Logger";
import { connect as connectDatabase } from "./libs/database/connection";
import { getRouter } from "./libs/route-loader";
import access from "./middleware/access-log";
import checkDatabase from "./middleware/database-checker";
import { load as loadLanguages } from "./libs/i18n";
import fetchI18n, { getI18nFunctionByLanguage } from "./middleware/fetch-i18n";
import AuthProvider from "./libs/auth/AuthProvider";
import getAuthProvider from "./middleware/get-auth-provider";
import { handleErrors, initializeSentry } from "./libs/error-handler";
import cors from "@elysiajs/cors";
import { verify as verifyMailOptions } from "./libs/mailer";
import { startMetrics, startReferralReset, startRoleCacheJob, startRoleSynchronization } from "./libs/cron-jobs";
import { config } from "./libs/config";
import { join } from "path";
import ip from "./middleware/ip";
import { captureException } from "@sentry/bun";
import { generateSecureCode, validateKeypair } from "./libs/crypto";
import { DocumentationCategory } from "./types/DocumentationCategory";

if(config.mongodb.trim().length == 0) {
    Logger.error('Database connection string is empty!');
    process.exit(1);
}

handleErrors();
if(config.sentry.enabled) initializeSentry(config.sentry.dsn);

// Elysia API
const elysia = new Elysia()
    .onRequest(checkDatabase)
    .onTransform(access)
    .use(ip)
    .use(cors())
    .use(fetchI18n)
    .use(getAuthProvider)
    .use(async () => await getRouter(join(__dirname, 'routes')))
    .use(swagger({
        path: '/docs',
        autoDarkMode: true,
        exclude: [
            '/docs',
            '/docs/json'
        ],
        documentation: {
            info: {
                version: config.version,
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
                { name: DocumentationCategory.Api, description: 'Get info about the API' },
                { name: DocumentationCategory.ApiKeys, description: 'API Key management' },
                { name: DocumentationCategory.Bans, description: 'Ban management' },
                { name: DocumentationCategory.GiftCodes, description: 'Gift code management' },
                { name: DocumentationCategory.Notes, description: 'Staff note management' },
                { name: DocumentationCategory.Partners, description: 'Partner management' },
                { name: DocumentationCategory.Referrals, description: 'Referral management' },
                { name: DocumentationCategory.Reports, description: 'Report management' },
                { name: DocumentationCategory.Roles, description: 'Route management' },
                { name: DocumentationCategory.Staff, description: 'Staff member management' },
                { name: DocumentationCategory.Tags, description: 'Tag management' },
            ]
        }
    }))
    .onStart(async () => Logger.info(`Elysia listening on port ${config.port}!`))
    .onError(({ code, set, error, request }) => {
        const i18n = getI18nFunctionByLanguage(request.headers.get('x-language') || undefined);

        if(code == 'VALIDATION') {
            set.status = 422;
            if(error.customError && typeof error.customError == 'string') return { error: i18n(error.customError) };
            const errorData = JSON.parse(error.message);
            return { error: errorData.summary || errorData.message || i18n('$.error.validation') };
        } else if(code == 'NOT_FOUND') {
            set.status = 404;
            return { error: i18n('$.error.notFound') };
        } else if(code == 'PARSE') {
            set.status = 422;
            return { error: i18n('$.error.invalid_body') };
        } else {
            set.status = 500;
            captureException(error);
            const requestId = generateSecureCode(32);
            Logger.error(`An error ocurred with request ${requestId}: ${error}`);
            return { error: i18n('$.error.unknownError'), id: requestId };
        }
    });

export type ElysiaApp = typeof elysia;

async function main() {
    AuthProvider.loadProviders();
    loadLanguages();
    verifyMailOptions();
    validateKeypair();
    connectDatabase(config.mongodb).then(() => {
        startRoleCacheJob();
        startRoleSynchronization();
        startMetrics();
        startReferralReset();
    });

    elysia.listen({ port: config.port });
}

main();