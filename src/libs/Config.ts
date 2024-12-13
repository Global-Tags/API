import { configDotenv } from "dotenv";

type Config = {
    port: number,
    ipHeader: string,
    strictAuth: boolean,
    logLevel: string,
    mongodb: string,
    baseUrl: string,
    validation: {
        tag: {
            min: number,
            max: number,
            blacklist: string[],
            watchlist: string[]
        },
        icon: {
            maxResolution: number,
            blacklist: string[]
        },
        notes: {
            maxLength: number
        }
    },
    github: {
        owner: string,
        repository: string,
        branch: string
    },
    sentry: {
        enabled: boolean,
        dsn: string
    },
    metrics: {
        enabled: boolean,
        cron: string,
        adminRole: string
    },
    mailer: {
        enabled: boolean,
        host: string,
        port: number,
        secure: boolean,
        auth: {
            username: string,
            password: string
        },
        sender: {
            address: string,
            name: string
        }
    }
};

function getEnvNumber(path: string | undefined, defaultValue: number) {
    const number = Number(path);
    return isNaN(number) ? defaultValue : number;
}

function getEnvBoolean(path: string | undefined, defaultValue: boolean) {
    if(!path) return defaultValue;
    return path.toLowerCase() === 'true';
}

configDotenv();
configDotenv({ path: `./.env.${process.env.NODE_ENV || 'dev'}`, override: true });

export let config: Config = {
    port: getEnvNumber(process.env.GT_PORT, 5500),
    ipHeader: process.env.GT_PROXY_IP_HEADER || 'x-real-ip',
    strictAuth: getEnvBoolean(process.env.GT_STRICT_AUTH, true),
    logLevel: process.env.GT_LOG_LEVEL || 'Info',
    mongodb: process.env.GT_MONGODB_CONNECTION || '',
    baseUrl: process.env.GT_BASE_URL || 'http://localhost:5500',
    validation: {
        tag: {
            min: getEnvNumber(process.env.GT_VALIDATION_TAG_MIN_LENGTH, 1),
            max: getEnvNumber(process.env.GT_VALIDATION_TAG_MAX_LENGTH, 30),
            blacklist: process.env.GT_VALIDATION_TAG_BLACKLIST?.split(',') || [],
            watchlist: process.env.GT_VALIDATION_TAG_WATCHLIST?.split(',') || []
        },
        icon: {
            maxResolution: getEnvNumber(process.env.GT_VALIDATION_ICON_MAX_RESOLUTION, 512),
            blacklist: process.env.GT_VALIDATION_ICON_BLACKLIST?.split(',') || []
        },
        notes: {
            maxLength: getEnvNumber(process.env.GT_VALIDATION_NOTES_MAX_LENGTH, 100)
        }
    },
    github: {
        owner: process.env.GT_GITHUB_OWNER || 'Global-Tags',
        repository: process.env.GT_GITHUB_REPOSITORY || 'API',
        branch: process.env.GT_GITHUB_BRANCH || 'master'
    },
    sentry: {
        enabled: getEnvBoolean(process.env.GT_SENTRY_ENABLED, false),
        dsn: process.env.GT_SENTRY_DSN || ''
    },
    metrics: {
        enabled: getEnvBoolean(process.env.GT_METRICS_ENABLED, true),
        cron: process.env.GT_METRICS_CRON || '0 0 * * *',
        adminRole: process.env.GT_METRICS_ADMIN_ROLE?.toUpperCase() || 'ADMIN'
    },
    mailer: {
        enabled: getEnvBoolean(process.env.GT_MAILER_ENABLED, false),
        host: process.env.GT_MAILER_HOST || 'localhost',
        port: getEnvNumber(process.env.GT_MAILER_PORT, 465),
        secure: getEnvBoolean(process.env.GT_MAILER_SECURE, true),
        auth: {
            username: process.env.GT_MAILER_AUTH_USERNAME || '',
            password: process.env.GT_MAILER_AUTH_PASSWORD || ''
        },
        sender: {
            address: process.env.GT_MAILER_SENDER_ADDRESS || '',
            name: process.env.GT_MAILER_SENDER_NAME || 'GlobalTags System'
        }
    }
};