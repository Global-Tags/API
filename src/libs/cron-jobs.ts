import { saveMetrics } from "./metrics";
import Logger from "./Logger";
import { config } from "./config";
import { synchronizeDiscordRoles, updateRoleCache } from "./database/schemas/Role";
import { isConnected } from "./database/connection";
import { Cron } from "croner";
import { resetMonthlyReferrals } from "./database/schemas/Player";

const tz = 'Europe/Berlin';

export function startMetrics() {
    if(!config.metrics.enabled) return;
    Logger.debug('Metric initialized.');
    new Cron(config.metrics.cron, saveMetrics, {
        name: 'Metrics Generator',
        timezone: tz
    });
}

export function startReferralReset() {
    new Cron('0 0 1 * *', resetMonthlyReferrals, {
        name: 'Referral Resetter',
        timezone: tz
    });
}

export function startRoleCacheJob() {
    const job = new Cron('*/30 * * * *', updateRoleCache, {
        name: 'Role Cache Updater',
        timezone: tz
    });
    job.trigger();
}

export function startRoleSynchronization() {
    if(!config.discordBot.enabled || !config.discordBot.syncedRoles.enabled) return;
    Logger.info('Role syncronization initialized.');
    const job = new Cron('*/10 * * * *', synchronizeDiscordRoles, {
        name: 'Role Synchronization',
        timezone: tz
    });
    job.trigger();
}