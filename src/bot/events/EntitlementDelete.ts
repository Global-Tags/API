import { Entitlement, EntitlementType } from "discord.js";
import Event from "../structs/Event";
import { bot } from "../../../config.json";
import { client } from "../bot";
import Logger from "../../libs/Logger";
import players from "../../database/schemas/players";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import entitlements from "../../database/schemas/entitlement";

export default class EntitlementDelete extends Event {
    constructor() {
        super('entitlementDelete', false);
    }

    async fire(entitlement: Entitlement) {
        if(!bot.entitlements.enabled || !entitlement.isTest()) return;
        const player = await players.findOne({ "connections.discord.id": entitlement.userId });
        const sku = bot.entitlements.skus.find((sku) => sku.id == entitlement.skuId);
        if(!sku) return;

        sendMessage({
            type: NotificationType.Entitlement,
            description: `<@!${entitlement.userId}> has deleted their **${sku.name}** subscription!`,
            head: !!player,
            uuid: player?.uuid || ''
        });

        await new entitlements({
            id: entitlement.id,
            sku_id: entitlement.skuId,
            user_id: entitlement.userId,
            expires_at: new Date()
        }).save();
    }
}