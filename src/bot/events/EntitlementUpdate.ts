import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import entitlement from "../../database/schemas/entitlement";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import players from "../../database/schemas/players";
import { config } from "../../libs/Config";
import { getSkus } from "../../libs/SkuManager";

const skus = getSkus();

export default class EntitlementUpdate extends Event {
    constructor() {
        super('entitlementUpdate', false);
    }

    async fire(oldEntitlement: Entitlement, newEntitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled) return;
        if(oldEntitlement.endsAt || !newEntitlement.endsAt) return;
        const player = await players.findOne({ "connections.discord.id": newEntitlement.userId });
        const sku = skus.find((sku) => sku.id == newEntitlement.skuId);
        if(!sku) return;

        sendMessage({
            type: NotificationType.Entitlement,
            description: `<@!${newEntitlement.userId}> has cancelled their **${sku.name}** subscription!`,
            head: !!player,
            uuid: player?.uuid || ''
        });

        await entitlement.insertMany({
            id: newEntitlement.id,
            sku_id: newEntitlement.skuId,
            user_id: newEntitlement.userId,
            expires_at: newEntitlement.endsAt,
            test: !newEntitlement.startsTimestamp
        });
    }
}