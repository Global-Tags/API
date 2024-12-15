import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import { client } from "../bot";
import Logger from "../../libs/Logger";
import players from "../../database/schemas/players";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { config } from "../../libs/Config";
import { getSkus } from "../../libs/SkuManager";

const skus = getSkus();

export default class EntitlementCreate extends Event {
    constructor() {
        super('entitlementCreate', false);
    }

    async fire(entitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled) return;
        const sku = skus.find((sku) => sku.id == entitlement.skuId);
        if(!sku) return;
        const player = await players.findOne({ "connections.discord.id": entitlement.userId });

        sendMessage({
            type: NotificationType.Entitlement,
            description: `${!entitlement.startsTimestamp ? '[**S**] ' : ''}<@!${entitlement.userId}> just subscribed to **${sku.name}**!`, // Temporary replacement for Entitlement#isTest. See https://github.com/discordjs/discord.js/issues/10610
            head: !!player,
            uuid: player?.uuid || ''
        })

        if(player) {
            player.roles.push(sku.role);
            await player.save();
        }
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