import { CronJob } from "cron";
import entitlement from "../database/schemas/entitlement";
import players from "../database/schemas/players";
import { NotificationType, sendMessage } from "./DiscordNotifier";
import { bot } from "../../config.json";
import { client } from "../bot/bot";
import Logger from "./Logger";

async function checkExpiredEntitlements() {
    const ent = await entitlement.find({ done: false, expires_at: { $lt: new Date() } });
    if(!ent) return;
    for (const entitlement of ent) {
        const player = await players.findOne({ "connections.discord.id": entitlement.user_id });
        const sku = bot.entitlements.skus.find((sku) => sku.id == entitlement.sku_id);
        if(!sku) continue;

        entitlement.done = true;
        entitlement.save();
        sendMessage({
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
            const guild = await client.guilds.fetch(bot.synced_roles.guild).catch(() => {
                Logger.error(`Couldn't fetch guild ${bot.synced_roles.guild}`);
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

export function startJob() {
    new CronJob('*/5 * * * *', checkExpiredEntitlements, null, true, "Europe/Berlin", null, true);
}