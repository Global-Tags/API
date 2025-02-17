import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import players from "../../database/schemas/players";
import { sendEntitlementMessage } from "../../libs/discord-notifier";
import entitlements from "../../database/schemas/entitlement";
import { config } from "../../libs/config";
import { fetchSku } from "../bot";

export default class EntitlementDelete extends Event {
    constructor() {
        super('entitlementDelete', false);
    }

    async fire(entitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled || !entitlement.isTest()) return;
        const player = await players.findOne({ 'connections.discord.id': entitlement.userId });
        const sku = await fetchSku(entitlement.skuId);
        if(!sku) return;

        sendEntitlementMessage(
            player?.uuid || '',
            `[**S**] <@!${entitlement.userId}> has deleted their **${sku?.name || 'Unknown SKU'}** subscription!`,
            !!player,
        );

        await entitlements.insertMany({
            id: entitlement.id,
            sku_id: entitlement.skuId,
            user_id: entitlement.userId,
            expires_at: new Date(),
            test: true
        });
    }
}