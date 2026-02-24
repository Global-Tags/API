import entitlement from "../database/schemas/entitlement";
import { fetchSku } from "../bot/bot";
import { isConnected } from "../database/mongo";
import { sendEntitlementMessage } from "./discord-notifier";
import { Player } from "../database/schemas/Player";

export async function checkExpiredEntitlements() {
    if(!isConnected()) return;
    const entitlements = await entitlement.find({ done: false, expires_at: { $lt: new Date() } });
    if(!entitlements) return;
    for (const entitlement of entitlements) {
        const player = await Player.findOne({ 'connections.discord.id': entitlement.user_id });
        const sku = await fetchSku(entitlement.sku_id);
        if(!sku) continue;

        entitlement.done = true;
        entitlement.save();
        if(!entitlement.test) {
            sendEntitlementMessage(
                `<@!${entitlement.user_id}>'s **${sku.name || 'Unknown SKU'}** subscription just expired!`,
                player?.uuid
            );
        }

        if(player) {
            let save = false;
            const roles = player.getActiveRoles().filter((role) => role.role.sku == sku.id && role.autoRemove);
            for(const role of roles) {
                if(player.removeRole(role.role.name)) save = true;
            }
            if(save) await player.save();
        }
    }
}