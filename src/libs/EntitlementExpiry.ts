import entitlement from "../database/schemas/entitlement";
import players from "../database/schemas/players";
import { NotificationType, sendMessage } from "./DiscordNotifier";
import { client } from "../bot/bot";
import Logger from "./Logger";
import { isConnected } from "../database/mongo";
import { config } from "./Config";
import { getSkus } from "./SkuManager";

const skus = getSkus();

export async function checkExpiredEntitlements() {
    if(!isConnected()) return;
    const entitlements = await entitlement.find({ done: false, expires_at: { $lt: new Date() } });
    if(!entitlements) return;
    for (const entitlement of entitlements) {
        const player = await players.findOne({ "connections.discord.id": entitlement.user_id });
        const sku = skus.find((sku) => sku.id == entitlement.sku_id);
        if(!sku) continue;

        entitlement.done = true;
        entitlement.save();
        if(!entitlement.test) sendMessage({
            type: NotificationType.Entitlement,
            description: `<@!${entitlement.user_id}>'s **${sku.name}** subscription just expired!`,
            head: !!player,
            uuid: player?.uuid || ''
        });

        if(player) {
            player.roles = player.roles.filter((role) => role != sku.role);
            await player.save();
        }

        if(sku.discordRole) {
            const guild = await client.guilds.fetch(config.discordBot.syncedRoles.guild).catch(() => {
                Logger.error(`Couldn't fetch guild ${config.discordBot.syncedRoles.guild}`);
                return null;
            });
            if(!guild) return;
            const member = await guild.members.fetch(entitlement.user_id).catch(() => {
                Logger.error(`Couldn't fetch member ${entitlement.user_id}`);
                return null;
            });
            if(!member) return;
            member.roles.remove(sku.discordRole);
        }
    }
}