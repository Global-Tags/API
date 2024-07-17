import * as bot from "../bot/bot";
import * as config from "../../config.json";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { capitalize } from "../bot/commands/PlayerInfo";

export enum NotificationType {
    Report,
    WatchlistAdd,
    WatchlistTagUpdate,
    Appeal,
    ModLog,
    DiscordLink,
    Referral
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

export function sendMessage(data: NotificationData) {
    if(data.type == NotificationType.Report && config.bot.reports.active) {
        _sendMessage(
            config.bot.reports.channel,
            config.bot.reports.content,
            new EmbedBuilder()
            .setColor(0xff0000)
            .setThumbnail(`https://laby.net/texture/profile/head/${data.uuid}.png?size=1024&overlay`)
            .setTitle(`New report!`)
            .addFields([
                {
                    name: `Reported UUID`,
                    value: `[\`${data.uuid}\`](https://laby.net/@${data.uuid})`
                },
                {
                    name: `Reported Tag`,
                    value: `\`\`\`${data.tag}\`\`\``
                },
                {
                    name: `Reporter UUID`,
                    value: `[\`${data.reporterUuid}\`](https://laby.net/@${data.reporterUuid})`
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
            .setThumbnail(`https://laby.net/texture/profile/head/${data.uuid}.png?size=1024&overlay`)
            .setTitle(`New watched player`)
            .addFields([
                {
                    name: `Watched UUID`,
                    value: `[\`${data.uuid}\`](https://laby.net/@${data.uuid})`
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
            .setThumbnail(`https://laby.net/texture/profile/head/${data.uuid}.png?size=1024&overlay`)
            .setTitle(`New tag change`)
            .addFields([
                {
                    name: `Watched UUID`,
                    value: `[\`${data.uuid}\`](https://laby.net/@${data.uuid})`
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
            .setThumbnail(`https://laby.net/texture/profile/head/${data.uuid}.png?size=1024&overlay`)
            .setTitle(`New ban appeal`)
            .addFields([
                {
                    name: `UUID`,
                    value: `[\`${data.uuid}\`](https://laby.net/@${data.uuid})`
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
            .setThumbnail(`https://laby.net/texture/profile/head/${data.uuid}.png?size=1024&overlay`)
            .setTitle(data.connected ? 'New discord connection' : 'Discord connection removed')
            .addFields([
                {
                    name: `UUID`,
                    value: `[\`${data.uuid}\`](https://laby.net/@${data.uuid})`
                },
                {
                    name: `User ID`,
                    value: `[\`${data.userId}\`](discord://-/users/${data.userId})`
                }
            ]),
            false
        );
    } else if(data.type == NotificationType.Referral && config.bot.referral.active) {
        _sendMessage(
            config.bot.referral.channel,
            `[\`${data.uuid}\`](<https://laby.net/@${data.uuid}>) has invited [\`${data.invited}\`](<https://laby.net/@${data.invited}>).`,
            null,
            false
        );
    } else if(data.type == NotificationType.ModLog && config.bot.mod_log.active) {
        const description = modlogDescription(data);
        _sendMessage(
            config.bot.mod_log.channel,
            `[**${ModLogType[data.logType]}**] [\`${data.staff}\`](<https://laby.net/@${data.staff}>)${data.discord ? ' [**D**]' : ''} → [\`${data.uuid}\`](<https://laby.net/@${data.uuid}>)${description ? `: ${description}` : ''}`,
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
    else if(type == ModLogType.EditBan) return `**Appealable**: \`${appealable ? `❌` : `✅`}\`. **Reason**: \`${reason}\``;
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