import * as bot from "../bot/bot";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { Profile } from "./Mojang";
import { getCustomIconUrl } from "../routes/icon";
import { capitalCase } from "change-case";
import { config } from "./Config";

export enum ModLogType {
    ChangeTag,
    ClearTag,
    Ban,
    Unban,
    EditBan,
    EditRoles,
    EditPosition,
    ChangeIconType,
    ClearIconTexture,
    Watch,
    Unwatch,
    CreateNote,
    DeleteNote,
    DeleteReport,
    CreateRole,
    ChangeRoleIcon,
    ChangeRolePermissions,
    DeleteRole,
}

type NotificationData = {
    uuid: string,
    logType: ModLogType,
    hasUser: boolean,
    staff: string,
    oldTag?: string,
    newTag?: string,
    reason?: string,
    appealable?: boolean,
    discord?: boolean,
    positions?: { old: string, new: string },
    permissions?: { added: string[], removed: string[] },
    roles?: { added: string[], removed: string[] },
    role?: string,
    roleIcon?: boolean,
    icons?: { old: { name: string, hash?: string | null }, new: { name: string, hash?: string | null } },
    note?: string,
    report?: string
};

export function sendReportMessage({ user, reporter, tag, reason } : {
    user: Profile,
    reporter: Profile,
    tag: string,
    reason: string
}) {
    if(!config.discordBot.notifications.reports.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.reports.channel,
        content: config.discordBot.notifications.reports.content,
        embed: new EmbedBuilder()
        .setColor(0xff0000)
        .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
        .setTitle(`New report!`)
        .addFields([
            {
                name: `Reported player`,
                value: `[\`${user.username || user.uuid}\`](https://laby.net/@${user.uuid})`
            },
            {
                name: `Reported Tag`,
                value: `\`\`\`${tag}\`\`\``
            },
            {
                name: `Reporter`,
                value: `[\`${reporter.username || reporter.uuid}\`](https://laby.net/@${reporter.uuid})`
            },
            {
                name: `Reason`,
                value: `\`\`\`${reason}\`\`\``
            }
        ])
    });
}

export function sendWatchlistAddMessage({ user, tag, word }: { user: Profile, tag: string, word: string }) {
    if(!config.discordBot.notifications.watchlist.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.watchlist.channel,
        content: config.discordBot.notifications.watchlist.content,
        embed: new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`New watched player`)
        .addFields([
            {
                name: `Watched player`,
                value: `[\`${user.username || user.uuid}\`](https://laby.net/@${user.uuid})`
            },
            {
                name: `New tag`,
                value: `\`\`\`${tag}\`\`\``
            },
            {
                name: `Matched word`,
                value: `\`\`\`${word}\`\`\``
            }
        ])
    });
}

export function sendWatchlistTagUpdateMessage(user: Profile, tag: string) {
    if(!config.discordBot.notifications.watchlist.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.watchlist.channel,
        content: config.discordBot.notifications.watchlist.content,
        embed: new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
            .setTitle(`New tag change`)
            .addFields([
                {
                    name: `Watched player`,
                    value: `[\`${user.username || user.uuid}\`](https://laby.net/@${user.uuid})`
                },
                {
                    name: `New tag`,
                    value: `\`\`\`${tag}\`\`\``
                }
            ])
    });
}

export function sendBanAppealMessage(user: Profile, reason: string) {
    if(!config.discordBot.notifications.banAppeals.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.banAppeals.channel,
        content: config.discordBot.notifications.banAppeals.content,
        embed: new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
            .setTitle(`New ban appeal`)
            .addFields([
                {
                    name: `Player`,
                    value: `[\`${user.username || user.uuid}\`](https://laby.net/@${user.uuid})`
                },
                {
                    name: `Reason`,
                    value: `\`\`\`${reason}\`\`\``
                }
            ])
    });
}

export function sendDiscordLinkMessage(user: Profile, userId: string, connected: boolean) {
    if(!config.discordBot.notifications.accountConnections.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.accountConnections.channel,
        content: null,
        embed: new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
            .setTitle(connected ? 'New discord connection' : 'Discord connection removed')
            .addFields([
                {
                    name: 'Player',
                    value: `[\`${user.username || user.uuid}\`](https://laby.net/@${user.uuid})`
                },
                {
                    name: connected ? 'User ID' : 'Previous User ID',
                    value: `[\`${userId}\`](discord://-/users/${userId})`
                }
            ]),
        actionButton: false
    });
}

export function sendEmailLinkMessage(user: Profile, email: string | null, connected: boolean) {
    if(!config.discordBot.notifications.accountConnections.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.accountConnections.channel,
        content: null,
        embed: new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
            .setTitle(connected ? 'New email connection' : 'Email connection removed')
            .addFields([
                {
                    name: `Player`,
                    value: `[\`${user.username}\`](https://laby.net/@${user.uuid})`
                },
                {
                    name: connected ? `Email` : 'Previous Email',
                    value: `${email ? `||${email}||` : '**\`HIDDEN\`**'}`
                }
            ]),
        actionButton: true
    });
}

export function sendReferralMessage(inviter: Profile, invited: Profile) {
    if(!config.discordBot.notifications.referrals.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.referrals.channel,
        content: `[\`${inviter.username || inviter.uuid}\`](<https://laby.net/@${inviter.uuid}>) has invited [\`${invited.username || invited.uuid}\`](<https://laby.net/@${invited.uuid}>).`,
        embed: null,
        actionButton: false
    });
}

export function sendEntitlementMessage(uuid: string, description: string, head: boolean) {
    if(!config.discordBot.notifications.entitlements.enabled) return;

    const embed = new EmbedBuilder()
        .setColor(bot.colors.standart)
        .setTitle('💵 Entitlement update')
        .setDescription(description);

    if(head) embed.setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`);

    sendMessage({
        channel: config.discordBot.notifications.entitlements.channel,
        content: null,
        embed,
        actionButton: false
    });
}

export function sendCustomIconUploadMessage(user: Profile, hash: string) {
    if(!config.discordBot.notifications.customIcons.enabled) return;

    const embed = new EmbedBuilder()
        .setColor(bot.colors.standart)
        .setTitle(':frame_photo: New icon upload')
        .setDescription(`Hash: [\`${hash}\`](<${getCustomIconUrl(user.uuid!, hash)}>)`)
        .addFields([
            {
                name: 'Player:',
                value: `[\`${user.username || user.uuid}\`](<https://laby.net/@${user.uuid}>)`
            }
        ])
        .setThumbnail(getCustomIconUrl(user.uuid!, hash));

    sendMessage({
        channel: config.discordBot.notifications.customIcons.channel,
        content: null,
        embed
    });
}

// TODO: Fix mod log arguments

export function sendModLogMessage({ user, staff, data }: { user: Profile | null, staff: Profile, data: NotificationData }) {
    if(!config.discordBot.notifications.mogLog.enabled) return;

    const description = modlogDescription(data);
    sendMessage({
        channel: config.discordBot.notifications.mogLog.channel,
        content: `[**${ModLogType[data.logType]}**] [\`${staff.username || staff.uuid}\`](<https://laby.net/@${staff.uuid}>)${data.discord ? ' [**D**]' : ''}${user ? ` → [\`${user.username || user.uuid}\`](<https://laby.net/@${user.uuid}>)` : ''}${description ? `: ${description}` : ''}`,
        embed: null,
        actionButton: false
    });
}

function modlogDescription(data: NotificationData): string | null {
    const { logType: type, oldTag, newTag, reason, appealable, positions, icons, note, report } = data;
    if(type == ModLogType.ChangeTag) return `\`${oldTag}\` → \`${newTag}\``;
    else if(type == ModLogType.Ban) return `**Reason**: \`${reason || 'No reason'}\``;
    else if(type == ModLogType.EditBan) return `**Appealable**: \`${appealable ? `✅` : `❌`}\`. **Reason**: \`${reason}\``;
    else if(type == ModLogType.EditRoles) return `\n\`\`\`diff\n${data.roles!.added.map((role) => `+ ${capitalCase(role)}`).join('\n')}${data.roles!.added.length > 0 && data.roles!.removed.length > 0 ? '\n' : ''}${data.roles!.removed.map((role) => `- ${capitalCase(role)}`).join('\n')}\`\`\``;
    else if(type == ModLogType.EditPosition) return `\`${capitalCase(positions!.old)}\` → \`${capitalCase(positions!.new)}\``;
    else if(type == ModLogType.ChangeIconType) return `\`${capitalCase(icons!.old.name)}\` → \`${capitalCase(icons!.new.name)}\``;
    else if(type == ModLogType.ClearIconTexture) return `[${icons!.old.hash}](${getCustomIconUrl(data.uuid, icons!.old.hash!)})`;
    else if(type == ModLogType.CreateNote || type == ModLogType.DeleteNote) return `\`${note}\``;
    else if(type == ModLogType.DeleteReport) return `\`${report}\``;
    else if(type == ModLogType.CreateRole) return `\`${data.role}\``;
    else if(type == ModLogType.ChangeRoleIcon) return `\`${data.roleIcon ? '❌' : '✅'}\` → \`${data.roleIcon ? '✅' : '❌'}\``;
    else if(type == ModLogType.ChangeRolePermissions) return `\n\`\`\`diff\n${data.permissions!.added.map((permission) => `+ ${capitalCase(permission)}`).join('\n')}${data.permissions!.added.length > 0 && data.permissions!.removed.length > 0 ? '\n' : ''}${data.permissions!.removed.map((permission) => `- ${capitalCase(permission)}`).join('\n')}\`\`\``;
    else if(type == ModLogType.DeleteRole) return `\`${data.role}\``;
    return null;
}

async function sendMessage({ channel, content, embed, actionButton = true } : {
    channel: string,
    content: string | null,
    embed: EmbedBuilder | null,
    actionButton?: boolean
}) {
    if(!config.discordBot.enabled) return;
    (await bot.client.channels.fetch(channel) as TextChannel)?.send({
        content: content != null ? content : undefined,
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