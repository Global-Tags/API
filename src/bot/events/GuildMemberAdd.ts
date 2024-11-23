import { Entitlement, GuildMember } from "discord.js";
import Event from "../structs/Event";
import { bot } from "../../../config.json";
import { client } from "../bot";
import Logger from "../../libs/Logger";
import players from "../../database/schemas/players";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class GuildMemberAdd extends Event {
    constructor() {
        super('guildMemberAdd', false);
    }

    async fire(member: GuildMember) {
        if(!bot.entitlements.enabled) return;
        const player = await players.findOne({ "connections.discord.id": member.id });
        if(!player) return;
        const entitlements = (await client.application!.entitlements.fetch({ user: member.id })).filter(e => e.isActive() && bot.entitlements.skus.some(sku => sku.id == e.skuId));

        for(const sku of bot.entitlements.skus.filter((sku) => entitlements.find((e) => e.skuId == sku.id))) {
            const entitlement = entitlements.find((e) => e.skuId == sku.id)!;

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
                member.roles.add(sku.discordRole);
            }
        }
    }
}