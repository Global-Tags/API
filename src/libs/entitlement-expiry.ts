import entitlement from "../database/schemas/entitlement";
import players from "../database/schemas/players";
import { fetchGuild } from "../bot/bot";
import Logger from "./Logger";
import { isConnected } from "../database/mongo";
import { config } from "./config";
import { getSkus } from "./sku-manager";
import { sendEntitlementMessage } from "./discord-notifier";

const skus = getSkus();

export async function checkExpiredEntitlements() {
    if(!isConnected()) return;
    const entitlements = await entitlement.find({ done: false, expires_at: { $lt: new Date() } });
    if(!entitlements) return;
    for (const entitlement of entitlements) {
        const player = await players.findOne({ 'connections.discord.id': entitlement.user_id });
        const sku = skus.find((sku) => sku.id == entitlement.sku_id);
        if(!sku) continue;

        entitlement.done = true;
        entitlement.save();
        if(!entitlement.test) {
            sendEntitlementMessage(
                player?.uuid || '',
                `<@!${entitlement.user_id}>'s **${sku.name}** subscription just expired!`,
                !!player
            );
        }

        if(player) {
            const role = player.roles.find((role) => role.name == sku.role);
            if(role && !role.manually_added && (!role.expires_at || role.expires_at < new Date())) {
                role.expires_at = new Date();
                await player.save();
            }
        }

        if(sku.discordRole) {
            const guild = await fetchGuild().catch(() => {
                Logger.error(`Couldn't fetch guild '${config.discordBot.server}'!`);
                return null;
            });
            if(!guild) return;
            const member = await guild.members.fetch(entitlement.user_id).catch(() => {
                Logger.error(`Couldn't fetch member '${entitlement.user_id}'!`);
                return null;
            });
            if(!member) return;
            member.roles.remove(sku.discordRole);
        }
    }
}