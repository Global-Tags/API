import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import entitlement from "../../database/schemas/entitlement";
import { sendEntitlementMessage } from "../../libs/discord-notifier";
import players from "../../database/schemas/Player";
import { config } from "../../libs/config";
import { fetchSku } from "../bot";

export default class EntitlementUpdateEvent extends Event {
    constructor() {
        super('entitlementUpdate', false);
    }

    async fire(oldEntitlement: Entitlement, newEntitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled) return;
        if(oldEntitlement.endsAt || !newEntitlement.endsAt) return;
        const player = await players.findOne({ 'connections.discord.id': newEntitlement.userId });
        const sku = await fetchSku(newEntitlement.skuId);
        if(!sku) return;

        sendEntitlementMessage(
            `<@!${newEntitlement.userId}> has cancelled their **${sku?.name || 'Unknown SKU'}** subscription!`,
            player?.uuid
        );

        await entitlement.insertMany({
            id: newEntitlement.id,
            sku_id: newEntitlement.skuId,
            user_id: newEntitlement.userId,
            expires_at: newEntitlement.endsAt,
            test: newEntitlement.isTest()
        });
    }
}