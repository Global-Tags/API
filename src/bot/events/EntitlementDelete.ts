import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import players from "../../database/schemas/players";
import { sendEntitlementMessage } from "../../libs/discord-notifier";
import entitlements from "../../database/schemas/entitlement";
import { config } from "../../libs/config";
import { getSkus } from "../../libs/sku-manager";

const skus = getSkus();

export default class EntitlementDelete extends Event {
    constructor() {
        super('entitlementDelete', false);
    }

    async fire(entitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled || !!entitlement.startsTimestamp) return; // Temporary replacement for Entitlement#isTest. See https://github.com/discordjs/discord.js/issues/10610
        const player = await players.findOne({ "connections.discord.id": entitlement.userId });
        const sku = skus.find((sku) => sku.id == entitlement.skuId);
        if(!sku) return;

        sendEntitlementMessage(
            player?.uuid || '',
            `[**S**] <@!${entitlement.userId}> has deleted their **${sku.name}** subscription!`,
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