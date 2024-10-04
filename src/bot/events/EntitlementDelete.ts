import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import { bot } from "../../../config.json";
import { client } from "../bot";
import Logger from "../../libs/Logger";
import players from "../../database/schemas/players";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class EntitlementDelete extends Event {
    constructor() {
        super('entitlementDelete', false);
    }

    async fire(entitlement: Entitlement) {
        if(!bot.entitlements.enabled) return;
        const sku = bot.entitlements.skus.find((sku) => sku.id == entitlement.skuId);
        if(!sku) return;
        const player = await players.findOne({ "connections.discord.id": entitlement.userId });

        sendMessage({
            type: NotificationType.Entitlement,
            description: `<@!${entitlement.userId}> has cancelled their **${sku.name}** subscription!`,
            head: !!player,
            uuid: player?.uuid || ''
        })

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
            const member = await guild.members.fetch(entitlement.userId).catch(() => {
                Logger.error(`Couldn't fetch member ${entitlement.userId}`);
                return null;
            });
            if(!member) return;
            member.roles.remove(sku.discordRole);
        }
    }
}