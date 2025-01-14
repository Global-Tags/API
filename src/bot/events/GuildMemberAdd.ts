import { GuildMember } from "discord.js";
import Event from "../structs/Event";
import { client } from "../bot";
import players from "../../database/schemas/players";
import { config } from "../../libs/config";
import { getSkus } from "../../libs/sku-manager";

const skus = getSkus();

export default class GuildMemberAdd extends Event {
    constructor() {
        super('guildMemberAdd', false);
    }

    async fire(member: GuildMember) {
        if(!config.discordBot.notifications.entitlements.enabled || member.guild.id != config.discordBot.server) return;
        const player = await players.findOne({ 'connections.discord.id': member.id });
        if(!player) return;
        const entitlements = (await client.application!.entitlements.fetch({ user: member.id })).filter(e => e.isActive() && skus.some(sku => sku.id == e.skuId));

        for(const sku of skus.filter((sku) => entitlements.find((e) => e.skuId == sku.id))) {
            if(sku.discordRoles.length > 0) {
                for(const role of sku.discordRoles) {
                    member.roles.add(role);
                }
            }
        }
    }
}