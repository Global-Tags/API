import { configDotenv } from "dotenv";
import { Role } from "./RoleManager";

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

export let config = {
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
    },
    ratelimiter: {
        enabled: getEnvBoolean(process.env.GT_RATELIMITER_ENABLED, true)
    },
    discordBot: {
        enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_ENABLED, false),
        token: process.env.GT_DISCORD_BOT_TOKEN || '',
        syncedRoles: {
            enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_SYNCED_ROLES_ENABLED, false),
            guild: process.env.GT_DISCORD_BOT_SYNCED_ROLES_GUILD || '',
            getRoles: (role: Role) => process.env[`GT_DISCORD_BOT_SYNCED_ROLES_${role.name.toUpperCase()}`]?.split(',') || []
        },
        notifications: {
            reports: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_REPORTS_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_REPORTS_CHANNEL || '',
                content: process.env.GT_DISCORD_BOT_REPORTS_CONTENT || ''
            },
            watchlist: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_WATCHLIST_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_WATCHLIST_CHANNEL || '',
                content: process.env.GT_DISCORD_BOT_WATCHLIST_CONTENT || ''
            },
            banAppeals: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_APPEALS_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_APPEALS_CHANNEL || '',
                content: process.env.GT_DISCORD_BOT_APPEALS_CONTENT || ''
            },
            mogLog: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_MODLOG_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_MODLOG_CHANNEL || ''
            },
            referrals: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_REFERRALS_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_REFERRALS_CHANNEL || ''
            },
            accountConnections: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_CHANNEL || '',
                role: process.env.GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_ROLE || ''
            },
            customIcons: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_CUSTOM_ICONS_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_CUSTOM_ICONS_CHANNEL || ''
            },
            entitlements: {
                enabled: getEnvBoolean(process.env.GT_DISCORD_BOT_ENTITLEMENTS_ENABLED, false),
                channel: process.env.GT_DISCORD_BOT_ENTITLEMENTS_CHANNEL || ''
            }
        }
    }
};