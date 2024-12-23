import { CronJob } from "cron";
import { checkExpiredEntitlements } from "./EntitlementExpiry";
import { saveMetrics } from "./Metrics";
import Logger from "./Logger";
import players from "../database/schemas/players";
import { config } from "./Config";

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
        const data = await players.find({ 'referrals.current_month': { $gt: 0 } });

        for(const player of data) {
            player.referrals.current_month = 0;
            player.save();
        }
    }, null, true, tz);
}