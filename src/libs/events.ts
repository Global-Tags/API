import { client, fetchGuild } from "../bot/bot";
import players from "../database/schemas/players";
import { getCachedRoles, synchronizeRoles } from "../database/schemas/roles";
import { config } from "./config";
import { sendDiscordLinkMessage } from "./discord-notifier";
import { GameProfile } from "./game-profiles";
import Logger from "./Logger";

export async function onDiscordLink(player: GameProfile, userId: string) {
    sendDiscordLinkMessage(
        player,
        userId,
        true
    );

    const playerData = await players.findOne({ 'connections.discord.id': userId });
    if(playerData) {
        let save = false;
        const entitlements = (await client.application!.entitlements.fetch({ user: userId })).filter(e => e.isActive());
        for(const entitlement of entitlements.values()) {
            const role = getCachedRoles().find((role) => role.sku == entitlement.skuId);
            if(role) {
                playerData.roles.push({
                    name: role.name,
                    added_at: new Date(),
                    manually_added: false,
                    expires_at: entitlement.endsAt,
                    reason: `Discord entitlement: ${entitlement.id}`
                });
                save = true;
            }
        }
        if(save) await playerData.save();
        synchronizeRoles();
    }

    const guild = await fetchGuild();
    if(!guild) return;
    const member = await guild.members.fetch(userId);
    if(!member) return;
    member.roles.add(config.discordBot.notifications.accountConnections.role);
}

export function onDiscordUnlink(player: GameProfile, userId: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        sendDiscordLinkMessage(
            player,
            userId,
            false
        );
    
        const guild = await fetchGuild();
        if(!guild) return;
        const member = await guild.members.fetch(userId);
        if(!member) return;
        member.roles.remove(config.discordBot.notifications.accountConnections.role);
        const playerData = await players.findOne({ 'connections.discord.id': userId });
        if(playerData) {
            for(const role of playerData.getRoles()) {
                const syncedRoles = role.role.getSyncedRoles();
                if(syncedRoles.length == 0) continue;
                for(const syncedRole of syncedRoles) {
                    if(!member.roles.cache.has(syncedRole)) continue;
                    member.roles.remove(syncedRole)
                        .then(() => Logger.debug(`Removed synced role "${syncedRole}" (${role.role.name}) from member "${member.id}".`))
                        .catch((error) => Logger.error(`Failed to remove synced role "${syncedRole}" (${role.role.name}) from member "${member.id}": ${error}`));
                }
            }
        }
        resolve();
    });
}