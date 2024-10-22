import * as bot from "../bot/bot";
import * as config from "../../config.json";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { capitalize } from "../bot/commands/PlayerInfo";
import axios from "axios";
import { getProfileByUUID } from "./Mojang";

export enum NotificationType {
    Report,
    WatchlistAdd,
    WatchlistTagUpdate,
    Appeal,
    ModLog,
    DiscordLink,
    Referral,
    Entitlement
}

export enum ModLogType {
    ChangeTag,
    ClearTag,
    Ban,
    Unban,
    EditBan,
    EditRoles,
    Watch,
    Unwatch
}

type NotificationData = {
    uuid: string
} & ({
    type: NotificationType.Report,
    reporterUuid: string,
    reason: string,
    tag: string
} | {
    type: NotificationType.WatchlistAdd,
    word: string,
    tag: string
} | { 
    type: NotificationType.WatchlistTagUpdate,
    tag: string
} | {
    type: NotificationType.Appeal,
    reason: string
} | {
    type: NotificationType.Referral,
    invited: string
} | {
    type: NotificationType.DiscordLink,
    connected: boolean,
    userId: string
} | {
    type: NotificationType.Entitlement,
    description: string,
    head: boolean
} | {
    type: NotificationType.ModLog,
    logType: ModLogType,
    staff: string,
    oldTag?: string,
    newTag?: string,
    reason?: string,
    appealable?: boolean,
    discord?: boolean,
    roles?: { added: string[], removed: string[] }
});

export async function sendMessage(data: NotificationData) {
    const { username: user, uuid } = await getProfileByUUID(data.uuid);
    const username = user || uuid;

    if(data.type == NotificationType.Report && config.bot.reports.active) {
        const profile = await getProfileByUUID(data.reporterUuid);

        _sendMessage(
            config.bot.reports.channel,
            config.bot.reports.content,
            new EmbedBuilder()
            .setColor(0xff0000)
            .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
            .setTitle(`New report!`)
            .addFields([
                {
                    name: `Reported player`,
                    value: `[\`${username}\`](https://laby.net/@${uuid})`
                },
                {
                    name: `Reported Tag`,
                    value: `\`\`\`${data.tag}\`\`\``
                },
                {
                    name: `Reporter`,
                    value: `[\`${profile.username || profile.uuid}\`](https://laby.net/@${profile.uuid})`
                },
                {
                    name: `Reason`,
                    value: `\`\`\`${data.reason}\`\`\``
                }
            ])
        )
    } else if(data.type == NotificationType.WatchlistAdd && config.bot.watchlist.active) {
        _sendMessage(
            config.bot.watchlist.channel,
            config.bot.watchlist.content,
            new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
            .setTitle(`New watched player`)
            .addFields([
                {
                    name: `Watched player`,
                    value: `[\`${username}\`](https://laby.net/@${uuid})`
                },
                {
                    name: `New tag`,
                    value: `\`\`\`${data.tag}\`\`\``
                },
                {
                    name: `Matched word`,
                    value: `\`\`\`${data.word}\`\`\``
                }
            ])
        );
    } else if(data.type == NotificationType.WatchlistTagUpdate && config.bot.watchlist.active) {
        _sendMessage(
            config.bot.watchlist.channel,
            config.bot.watchlist.content,
            new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
            .setTitle(`New tag change`)
            .addFields([
                {
                    name: `Watched player`,
                    value: `[\`${username}\`](https://laby.net/@${uuid})`
                },
                {
                    name: `New tag`,
                    value: `\`\`\`${data.tag}\`\`\``
                }
            ])
        );
    } else if(data.type == NotificationType.Appeal && config.bot.appeals.active) {
        _sendMessage(
            config.bot.appeals.channel,
            config.bot.appeals.content,
            new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
            .setTitle(`New ban appeal`)
            .addFields([
                {
                    name: `Player`,
                    value: `[\`${username}\`](https://laby.net/@${uuid})`
                },
                {
                    name: `Reason`,
                    value: `\`\`\`${data.reason}\`\`\``
                }
            ])
        );
    } else if(data.type == NotificationType.DiscordLink && config.bot.connection.active) {
        _sendMessage(
            config.bot.connection.log,
            undefined,
            new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
            .setTitle(data.connected ? 'New discord connection' : 'Discord connection removed')
            .addFields([
                {
                    name: `Player`,
                    value: `[\`${username}\`](https://laby.net/@${uuid})`
                },
                {
                    name: `User ID`,
                    value: `[\`${data.userId}\`](discord://-/users/${data.userId})`
                }
            ]),
            false
        );
    } else if(data.type == NotificationType.Referral && config.bot.referral.active) {
        const profile = await getProfileByUUID(data.invited);

        _sendMessage(
            config.bot.referral.channel,
            `[\`${username}\`](<https://laby.net/@${uuid}>) has invited [\`${profile.username || profile.uuid}\`](<https://laby.net/@${profile.uuid}>).`,
            null,
            false
        );
    } else if(data.type == NotificationType.Entitlement && config.bot.entitlements.enabled) {
        const embed = new EmbedBuilder()
        .setColor(bot.colors.standart)
        .setTitle('💵 Entitlement update')
        .setDescription(data.description);

        if(data.head) embed.setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`);

        _sendMessage(
            config.bot.entitlements.log,
            undefined,
            embed,
            false
        )
    } else if(data.type == NotificationType.ModLog && config.bot.mod_log.active) {
        const profile = await getProfileByUUID(data.staff);

        const description = modlogDescription(data);
        _sendMessage(
            config.bot.mod_log.channel,
            `[**${ModLogType[data.logType]}**] [\`${profile.username || profile.uuid}\`](<https://laby.net/@${profile.uuid}>)${data.discord ? ' [**D**]' : ''} → [\`${username}\`](<https://laby.net/@${uuid}>)${description ? `: ${description}` : ''}`,
            null,
            false
        );
    }
}

function modlogDescription(data: NotificationData): string | null {
    if(data.type != NotificationType.ModLog) return null;
    const { logType: type, oldTag, newTag, reason, appealable } = data;
    if(type == ModLogType.ChangeTag) return `\`${oldTag}\` → \`${newTag}\``;
    else if(type == ModLogType.Ban) return `**Reason**: \`${reason || 'No reason'}\``;
    else if(type == ModLogType.EditBan) return `**Appealable**: \`${appealable ? `✅` : `❌`}\`. **Reason**: \`${reason}\``;
    else if(type == ModLogType.EditRoles) return `\n\`\`\`diff\n${data.roles!.added.map((role) => `+ ${capitalize(role)}`).join('\n')}${data.roles!.added.length > 0 && data.roles!.removed.length > 0 ? '\n' : ''}${data.roles!.removed.map((role) => `- ${capitalize(role)}`).join('\n')}\`\`\``;
    return null;
}

function _sendMessage(channel: string, content: string | undefined, embed: EmbedBuilder | null, actionButton: boolean = true) {
    if(!config.bot.enabled) return;
    (bot.client.channels.cache.get(channel) as TextChannel).send({
        content,
        embeds: embed == null ? [] : [embed],
        components: actionButton ? [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Actions`)
                .setCustomId(`actions`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Finish actions`)
                .setCustomId(`finishAction`)
                .setStyle(ButtonStyle.Success),
            )
        ] : []
    });
}