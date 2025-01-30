import { CronJob } from "cron";
import { checkExpiredEntitlements } from "./entitlement-expiry";
import { saveMetrics } from "./metrics";
import Logger from "./Logger";
import playerSchema from "../database/schemas/players";
import { config } from "./config";
import { synchronizeRoles, updateRoleCache } from "../database/schemas/roles";
import { isConnected } from "../database/mongo";

const tz = 'Europe/Berlin';

export function startEntitlementExpiry() {
    if(!config.discordBot.notifications.entitlements.enabled) return;
    Logger.debug('Entitlement expiry initialized.');
    new CronJob('*/5 * * * *', checkExpiredEntitlements, null, true, tz, null, true);
}

export function startMetrics() {
    if(!config.metrics.enabled) return;
    Logger.debug('Metric initialized.');
    new CronJob(config.metrics.cron, saveMetrics, null, true, tz);
}

export function startReferralReset() {
    new CronJob('0 0 1 * *', async () => {
        if(!isConnected()) return;
        const data = await playerSchema.find({ 'referrals.current_month': { $gt: 0 } });

        for(const player of data) {
            player.referrals.current_month = 0;
            player.save();
        }
    }, null, true, tz);
}

export function startRoleCacheJob() {
    new CronJob('*/30 * * * *', updateRoleCache, null, true, tz, null, true);
}

export function startRoleSynchronization() {
    if(!config.discordBot.syncedRoles.enabled) return;
    Logger.debug('Role syncronization initialized.');
    new CronJob('*/10 * * * *', synchronizeRoles, null, true, tz, null, true);
}