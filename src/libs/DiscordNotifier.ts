import * as bot from "../bot/bot";
import * as config from "../../config.json";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { capitalize } from "../bot/commands/PlayerInfo";
import { getProfileByUUID } from "./Mojang";
import { base } from "../../config.json";

export enum NotificationType {
    Report,
    WatchlistAdd,
    WatchlistTagUpdate,
    Appeal,
    ModLog,
    DiscordLink,
    Referral,
    Entitlement,
    CustomIconUpload
}

export enum ModLogType {
    ChangeTag,
    ClearTag,
    Ban,
    Unban,
    EditBan,
    EditRoles,
    EditPosition,
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
    type: NotificationType.CustomIconUpload,
    hash: string
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
    positions?: { old: string, new: string },
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
    } else if(data.type == NotificationType.CustomIconUpload && config.bot.custom_icons.active) {
        const embed = new EmbedBuilder()
        .setColor(bot.colors.standart)
        .setTitle(':frame_photo: New icon upload')
        .setDescription(`Hash: [\`${data.hash}\`](<${base}/players/${uuid}/icon/${data.hash}>)`)
        .addFields([
            {
                name: 'Player:',
                value: `[\`${username}\`](<https://laby.net/@${uuid}>)`
            }
        ])
        .setThumbnail(`${base}/players/${data.uuid}/icon/${data.hash}`);

        _sendMessage(
            config.bot.custom_icons.log,
            undefined,
            embed,
            true
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
    const { logType: type, oldTag, newTag, reason, appealable, positions } = data;
    if(type == ModLogType.ChangeTag) return `\`${oldTag}\` → \`${newTag}\``;
    else if(type == ModLogType.Ban) return `**Reason**: \`${reason || 'No reason'}\``;
    else if(type == ModLogType.EditBan) return `**Appealable**: \`${appealable ? `✅` : `❌`}\`. **Reason**: \`${reason}\``;
    else if(type == ModLogType.EditRoles) return `\n\`\`\`diff\n${data.roles!.added.map((role) => `+ ${capitalize(role)}`).join('\n')}${data.roles!.added.length > 0 && data.roles!.removed.length > 0 ? '\n' : ''}${data.roles!.removed.map((role) => `- ${capitalize(role)}`).join('\n')}\`\`\``;
    else if(type == ModLogType.EditPosition) return `\`${positions!.old}\` → \`${positions!.new}\``;
    return null;
}

async function _sendMessage(channel: string, content: string | undefined, embed: EmbedBuilder | null, actionButton: boolean = true) {
    if(!config.bot.enabled) return;
    (await bot.client.channels.fetch(channel) as TextChannel)?.send({
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