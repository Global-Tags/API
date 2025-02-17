import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import { fetchSku } from "../bot";
import players from "../../database/schemas/players";
import { sendEntitlementMessage } from "../../libs/discord-notifier";
import { config } from "../../libs/config";
import { getCachedRoles } from "../../database/schemas/roles";

const roleReason = (entitlement: string) => `Discord entitlement: ${entitlement}`;

export default class EntitlementCreate extends Event {
    constructor() {
        super('entitlementCreate', false);
    }

    async fire(entitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled) return;
        const role = getCachedRoles().find((role) => role.sku == entitlement.skuId);
        if(!role) return;
        const sku = await fetchSku(entitlement.skuId);
        const player = await players.findOne({ 'connections.discord.id': entitlement.userId });

        sendEntitlementMessage(
            player?.uuid || '',
            `${entitlement.isTest() ? '[**S**] ' : ''}<@!${entitlement.userId}> just subscribed to **${sku?.name || 'Unknown SKU'}**!`,
            !!player,
        );

        if(player) {
            const playerRole = player.roles.find((playerRole) => playerRole.name == role.name);
            if(playerRole) {
                if(playerRole.expires_at && playerRole.expires_at > new Date()) {
                    playerRole.added_at = new Date();
                    playerRole.manually_added = false;
                    playerRole.expires_at = null;
                    playerRole.reason = roleReason(entitlement.id);
                    await player.save();
                }
            } else {
                player.roles.push({
                    name: role.name,
                    added_at: new Date(),
                    manually_added: false,
                    reason: roleReason(entitlement.id)
                });
                await player.save();
            }
        }
    }
}