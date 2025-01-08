import { fetchGuild } from "../bot/bot";
import { config } from "./config";
import { sendDiscordLinkMessage } from "./discord-notifier";
import { Profile } from "./game-profiles";

export async function onDiscordLink(player: Profile, userId: string) {
    sendDiscordLinkMessage(
        player,
        userId,
        true
    );

    const guild = await fetchGuild();
    if(!guild) return;
    const member = await guild.members.fetch(userId);
    if(!member) return;
    member.roles.add(config.discordBot.notifications.accountConnections.role);
}

export async function onDiscordUnlink(player: Profile, userId: string) {
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
}