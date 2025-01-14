import { CronJob } from "cron";
import { checkExpiredEntitlements } from "./entitlement-expiry";
import { saveMetrics } from "./metrics";
import Logger from "./Logger";
import playerSchema from "../database/schemas/players";
import { config } from "./config";
import { getCachedRoles, updateRoleCache } from "../database/schemas/roles";
import { isConnected } from "../database/mongo";
import { fetchGuild } from "../bot/bot";

const tz = 'Europe/Berlin';
const syncReason = 'Discord role sync';

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
    new CronJob('*/5 * * * *', updateRoleCache, null, true, tz, null, true);
}

export function startRoleSynchronization() {
    if(!config.discordBot.syncedRoles.enabled) return;
    Logger.debug('Role syncronization initialized.');
    new CronJob('*/20 * * * *', async () => {
        if(!isConnected()) return;
        const players = await playerSchema.find({ 'connections.discord.id': { $exists: true } });
        const guild = await fetchGuild();
        const roles = getCachedRoles();

        for(const player of players) {
            const member = await guild.members.fetch(player.connections.discord.id!).catch(() => null);
            if(!member || !member.id) continue;
            let save = false;
            const playerRoles = player.roles
                .filter((role) => !role.expires_at || role.expires_at.getTime() > Date.now());

            for(const role of roles) {
                if(role.getSyncedRoles().length == 0) continue;
                const hasRole = role.getSyncedRoles().some((role) => member.roles.cache.has(role));

                if(hasRole) {
                    const playerRole = player.roles.find((r) => r.name == role.name);
                    if(!playerRole) {
                        player.roles.push({
                            name: role.name,
                            added_at: new Date(),
                            reason: syncReason,
                            manually_added: false
                        });
                        save = true;
                    } else if(playerRole.expires_at && playerRole.expires_at.getTime() < Date.now()) {
                        playerRole.expires_at = null;
                        playerRole.added_at = new Date();
                        playerRole.expires_at = null;
                        playerRole.reason = syncReason;
                        playerRole.manually_added = false;
                        save = true;
                    }
                } else {
                    const playerRole = playerRoles.find((r) => r.name == role.name);
                    if(!playerRole || playerRole.manually_added) continue;
                    playerRole.expires_at = new Date();
                    save = true;
                }
            }
            if(save) {
                Logger.debug(`Synced roles for ${player.uuid} (${member.id}).`);
                player.save();
            }
        }
    }, null, true, tz, null, true);
}