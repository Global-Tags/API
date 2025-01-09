import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import entitlement from "../../database/schemas/entitlement";
import { sendEntitlementMessage } from "../../libs/discord-notifier";
import players from "../../database/schemas/players";
import { config } from "../../libs/config";
import { getSkus } from "../../libs/sku-manager";

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

        sendEntitlementMessage(
            player?.uuid || '',
            `<@!${newEntitlement.userId}> has cancelled their **${sku.name}** subscription!`,
            !!player,
        );

        await entitlement.insertMany({
            id: newEntitlement.id,
            sku_id: newEntitlement.skuId,
            user_id: newEntitlement.userId,
            expires_at: newEntitlement.endsAt,
            test: !newEntitlement.startsTimestamp
        });
    }
}