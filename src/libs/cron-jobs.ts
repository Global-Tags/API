import { CronJob } from "cron";
import { checkExpiredEntitlements } from "./entitlement-expiry";
import { saveMetrics } from "./metrics";
import Logger from "./Logger";
import playerSchema, { resetMonthlyReferrals } from "../database/schemas/players";
import { config } from "./config";
import { synchronizeRoles, updateRoleCache } from "../database/schemas/roles";
import { isConnected } from "../database/mongo";

const tz = 'Europe/Berlin';

export function startEntitlementExpiry() {
    if(!config.discordBot.notifications.entitlements.enabled) return;
    Logger.debug('Entitlement expiry initialized.');
    new CronJob('*/5 * * * *', () => { setImmediate(() => {
        Logger.debug('Start - checkExpiredEntitlements');
        checkExpiredEntitlements();
        Logger.debug('End - checkExpiredEntitlements');
    }) }, null, false, tz, null, true).start();
}

export function startMetrics() {
    if(!config.metrics.enabled) return;
    Logger.debug('Metric initialized.');
    new CronJob(config.metrics.cron, () => { setImmediate(() => {
        Logger.debug('Start - saveMetrics');
        saveMetrics();
        Logger.debug('End - saveMetrics');
    }) }, null, false, tz).start();
}

export function startReferralReset() {
    new CronJob('0 0 1 * *', () => {
        setImmediate(async () => {
            Logger.debug('Start - resetReferrals');
            resetMonthlyReferrals();
            Logger.debug('End - resetReferrals');
        });
    }, null, false, tz).start();
}

export function startRoleCacheJob() {
    new CronJob('*/30 * * * *', () => { setImmediate(() => {
        Logger.debug('Start - updateRoleCache');
        updateRoleCache();
        Logger.debug('End - updateRoleCache');
    }) }, null, false, tz, null, true).start();
}

export function startRoleSynchronization() {
    if(!config.discordBot.syncedRoles.enabled) return;
    Logger.debug('Role syncronization initialized.');
    new CronJob('*/10 * * * *', () => { setImmediate(() => {
        Logger.debug('Start - synchronizeRoles');
        synchronizeRoles();
        Logger.debug('End - synchronizeRoles');
    }) }, null, false, tz, null, true).start();
}