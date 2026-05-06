import { client, fetchGuild } from "../bot/bot";
import { Player, RoleCondition } from "./database/schemas/Player";
import { getCachedRoles, synchronizeDiscordRoles } from "./database/schemas/Role";
import { config } from "./config";
import { sendDiscordLinkMessage } from "./discord-notifier";
import { GameProfile } from "./game-profiles";
import Logger from "./Logger";

// TODO: Find a better solution for this
export async function onDiscordLink(player: GameProfile, userId: string) {
    sendDiscordLinkMessage(
        player,
        userId,
        true
    );

    const guild = await fetchGuild();
    const member = await guild?.members.fetch(userId).catch(() => null);
    if(member) member.roles.add(config.discordBot.notifications.accountConnections.role);

    const playerData = await Player.findOne({ 'connections.discord.id': userId });
    if(!playerData || !member?.premiumSince) return;
    const boosterRole = getCachedRoles().find((role) => role.id === config.discordBot.boosterRole);
    if(boosterRole) {
        playerData.addRole({ id: boosterRole.id, reason: 'Server boost', addConditions: [RoleCondition.ServerBoost], visible: true, expiresAt: null, duration: null });
        await playerData.save();
        synchronizeDiscordRoles();
    }
}

export function onDiscordUnlink(player: GameProfile, userId: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        sendDiscordLinkMessage(
            player,
            userId,
            false
        );
    
        const guild = await fetchGuild();
        if(!guild) return resolve();
        const member = await guild.members.fetch(userId).catch(() => null);
        if(!member) return resolve();
        member.roles.remove(config.discordBot.notifications.accountConnections.role);

        const playerData = await Player.findOne({ 'connections.discord.id': userId });
        if(playerData) {
            if(member.premiumSince) {
                const boosterRole = getCachedRoles().find((role) => role.id == config.discordBot.boosterRole);
                if(boosterRole) {
                    const role = playerData.getRole(boosterRole.id);
                    if(role && role.conditions.includes(RoleCondition.ServerBoost) && role.expiresAt == null && playerData.removeRole(boosterRole.id)) playerData.save();
                }
            }
            for(const role of playerData.getActiveRoles()) {
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