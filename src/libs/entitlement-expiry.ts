import entitlement from "../database/schemas/entitlement";
import players from "../database/schemas/players";
import { fetchSku } from "../bot/bot";
import { isConnected } from "../database/mongo";
import { sendEntitlementMessage } from "./discord-notifier";
import { getCachedRoles } from "../database/schemas/roles";

export async function checkExpiredEntitlements() {
    if(!isConnected()) return;
    const entitlements = await entitlement.find({ done: false, expires_at: { $lt: new Date() } });
    if(!entitlements) return;
    for (const entitlement of entitlements) {
        const player = await players.findOne({ 'connections.discord.id': entitlement.user_id });
        const sku = await fetchSku(entitlement.sku_id);
        if(!sku) continue;

        entitlement.done = true;
        entitlement.save();
        if(!entitlement.test) {
            sendEntitlementMessage(
                player?.uuid || '',
                `<@!${entitlement.user_id}>'s **${sku.name || 'Unknown SKU'}** subscription just expired!`,
                !!player
            );
        }

        if(player) {
            const roles = player.roles.filter((playerRole) => 
                getCachedRoles().find((role) => playerRole.name == role.name)?.sku == sku.id
                && !playerRole.manually_added
                && (!playerRole.expires_at || playerRole.expires_at.getTime() > Date.now())
            );
            for(const role of roles) {
                role.expires_at = new Date();
                await player.save();
            }
        }
    }
}