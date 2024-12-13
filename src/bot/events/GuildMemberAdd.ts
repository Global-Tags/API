import { GuildMember } from "discord.js";
import Event from "../structs/Event";
import { client } from "../bot";
import Logger from "../../libs/Logger";
import players from "../../database/schemas/players";
import { config } from "../../libs/Config";
import { getSkus } from "../../libs/SkuManager";

const skus = getSkus();

export default class GuildMemberAdd extends Event {
    constructor() {
        super('guildMemberAdd', false);
    }

    async fire(member: GuildMember) {
        if(!config.discordBot.notifications.entitlements.enabled) return;
        const player = await players.findOne({ "connections.discord.id": member.id });
        if(!player) return;
        const entitlements = (await client.application!.entitlements.fetch({ user: member.id })).filter(e => e.isActive() && skus.some(sku => sku.id == e.skuId));

        for(const sku of skus.filter((sku) => entitlements.find((e) => e.skuId == sku.id))) {
            const entitlement = entitlements.find((e) => e.skuId == sku.id)!;

            if(sku.discordRole) {
                const guild = await client.guilds.fetch(config.discordBot.syncedRoles.guild).catch(() => {
                    Logger.error(`Couldn't fetch guild ${config.discordBot.syncedRoles.guild}`);
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