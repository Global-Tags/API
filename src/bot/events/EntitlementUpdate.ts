import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import { bot } from "../../../config.json";
import entitlement from "../../database/schemas/entitlement";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import players from "../../database/schemas/players";

export default class EntitlementUpdate extends Event {
    constructor() {
        super('entitlementUpdate', false);
    }

    async fire(oldEntitlement: Entitlement, newEntitlement: Entitlement) {
        if(!bot.entitlements.enabled) return;
        if(oldEntitlement.endsAt || !newEntitlement.endsAt) return;
        const player = await players.findOne({ "connections.discord.id": newEntitlement.userId });
        const sku = bot.entitlements.skus.find((sku) => sku.id == newEntitlement.skuId);
        if(!sku) return;

        sendMessage({
            type: NotificationType.Entitlement,
            description: `<@!${newEntitlement.userId}> has deleted their **${sku.name}** subscription!`,
            head: !!player,
            uuid: player?.uuid || ''
        });

        await new entitlement({
            id: newEntitlement.id,
            sku_id: newEntitlement.skuId,
            user_id: newEntitlement.userId,
            expires_at: newEntitlement.endsAt
        }).save();
    }
}