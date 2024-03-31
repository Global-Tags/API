import * as bot from "../bot/bot";
import * as config from "../../config.json";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";

export enum NotificationType {
    Report,
    WatchlistAdd,
    WatchlistTagUpdate
}

type NotificationData = {
    uuid: string,
    tag: string
} & ({
    type: NotificationType.Report,
    reporterUuid: string,
    reason: string
} | {
    type: NotificationType.WatchlistAdd,
    word: string
} | { 
    type: NotificationType.WatchlistTagUpdate
});

export function sendMessage(data: NotificationData) {
    if(data.type == NotificationType.Report) {
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
    } else if(data.type == NotificationType.WatchlistAdd) {
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
    } else if(data.type == NotificationType.WatchlistTagUpdate) {
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
    }
}

function _sendMessage(channel: string, content: string, embed: EmbedBuilder) {
    if(!config.bot.enabled) return;
    (bot.client.channels.cache.get(channel) as TextChannel).send({
        content,
        embeds: [embed],
        components: [
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
        ]
    });
}