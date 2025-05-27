import { checkExpiredEntitlements } from "./entitlement-expiry";
import { saveMetrics } from "./metrics";
import Logger from "./Logger";
import playerSchema from "../database/schemas/players";
import { config } from "./config";
import { synchronizeRoles, updateRoleCache } from "../database/schemas/roles";
import { isConnected } from "../database/mongo";
import { Cron } from "croner";

const tz = 'Europe/Berlin';

export function startEntitlementExpiry() {
    if(!config.discordBot.notifications.entitlements.enabled) return;
    Logger.debug('Entitlement expiry initialized.');
    const job = new Cron('*/5 * * * *', checkExpiredEntitlements, {
        name: 'Entitlement Expiry Check',
        timezone: tz
    });
    job.trigger();
}

export function startMetrics() {
    if(!config.metrics.enabled) return;
    Logger.debug('Metric initialized.');
    new Cron(config.metrics.cron, saveMetrics, {
        name: 'Metrics Generator',
        timezone: tz
    });
}

export function startReferralReset() {
    new Cron('0 0 1 * *', async () => {
        if(!isConnected()) return;
        const data = await playerSchema.find({ 'referrals.current_month': { $gt: 0 } });

        for(const player of data) {
            player.referrals.current_month = 0;
            player.save();
        }
    }, {
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
    if(!config.discordBot.syncedRoles.enabled) return;
    Logger.info('Role syncronization initialized.');
    const job = new Cron('*/10 * * * *', synchronizeRoles, {
        name: 'Role Synchronization',
        timezone: tz
    });
    job.trigger();
}