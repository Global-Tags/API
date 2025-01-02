import { fetchGuild } from "../bot/bot";
import { config } from "./Config";
import { sendDiscordLinkMessage } from "./DiscordNotifier";
import { Profile } from "./Mojang";

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