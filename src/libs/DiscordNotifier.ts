import * as bot from "../bot/bot";
import * as config from "../../config.json";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { translateColors } from "../bot/commands/PlayerInfo";

export enum NotificationType {
    Report,
    WatchlistAdd,
    WatchlistTagUpdate,
    Appeal,
    ModLog
}

export enum ModLogType {
    ChangeTag,
    ClearTag,
    Ban,
    Unban,
    MakeAdmin,
    RemoveAdmin
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
    type: NotificationType.ModLog,
    logType: ModLogType,
    staff: string,
    oldTag?: string,
    newTag?: string,
    reason?: string
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
                    value: `\`\`\`${data.uuid}\`\`\``
                },
                {
                    name: `Reported Tag`,
                    value: `\`\`\`${data.tag}\`\`\``
                },
                {
                    name: `Reporter UUID`,
                    value: `\`\`\`${data.reporterUuid}\`\`\``
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
                    value: `\`\`\`${data.uuid}\`\`\``
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
                    value: `\`\`\`${data.uuid}\`\`\``
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
                    value: `\`\`\`${data.uuid}\`\`\``
                },
                {
                    name: `Reason`,
                    value: `\`\`\`${data.reason}\`\`\``
                }
            ])
        );
    } else if(data.type == NotificationType.ModLog && config.bot.mod_log.active) {
        _sendMessage(
            config.bot.mod_log.channel,
            `[**${ModLogType[data.logType]}**] [\`${data.staff}\`](<https://laby.net/${data.staff}>) → [\`${data.uuid}\`](<https://laby.net/${data.uuid}>)${data.logType == ModLogType.ChangeTag ? `: \`${data.oldTag}\` → \`${data.newTag}\`` : data.logType == ModLogType.Ban ? `: \`${data.reason || 'No reason'}\`` : ''}`,
            null,
            false
        );
    }
}

function _sendMessage(channel: string, content: string, embed: EmbedBuilder | null, actionButton: boolean = true) {
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