import * as bot from "../bot/bot";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { GameProfile } from "./game-profiles";
import { getCustomIconUrl } from "../routes/players/[uuid]/icon";
import { capitalCase, pascalCase, sentenceCase } from "change-case";
import { config } from "./config";
import { translateToAnsi } from "./chat-color";
import { GiftCode } from "../database/schemas/gift-codes";

export enum ModLogType {
    ChangeTag,
    ClearTag,
    Ban,
    Unban,
    EditBan,
    AddRole,
    RemoveRole,
    EditRoleNote,
    SetRoleExpiration,
    EditPosition,
    ChangeIconType,
    ClearIconTexture,
    Watch,
    Unwatch,
    CreateApiKey,
    RegenerateApiKey,
    DeleteApiKey,
    CreateGiftCode,
    DeleteGiftCode,
    CreateNote,
    DeleteNote,
    DeleteReport,
    CreateRole,
    RenameRole,
    ToggleRoleIcon,
    ChangeRolePermissions,
    SetRoleSku,
    DeleteRole,
    UnlinkConnection,
    ResetLinkingCode
}

type ModLogData = {
    logType: ModLogType,
    staff: GameProfile,
    user?: GameProfile,
    discord: boolean
} & ({
    logType: ModLogType.ChangeTag,
    tags: { old: string, new: string }
} | {
    logType: ModLogType.ClearTag
} | {
    logType: ModLogType.Ban,
    reason: string,
    appealable: boolean,
    expires?: Date | null
} | {
    logType: ModLogType.Unban
} | {
    logType: ModLogType.EditBan,
    reason?: string,
    appealable: boolean
} | {
    logType: ModLogType.AddRole | ModLogType.RemoveRole | ModLogType.CreateRole | ModLogType.DeleteRole,
    role: string
} | {
    logType: ModLogType.EditRoleNote,
    role: string,
    note: string | null
} | {
    logType: ModLogType.SetRoleExpiration,
    role: string,
    expires: Date | null
} | {
    logType: ModLogType.EditPosition,
    positions: { old: string, new: string }
} | {
    logType: ModLogType.ChangeIconType,
    icons: { old: string, new: string }
} | {
    logType: ModLogType.ClearIconTexture,
    hash: string
} | {
    logType: ModLogType.Watch
} | {
    logType: ModLogType.Unwatch
} | {
    logType: ModLogType.CreateApiKey | ModLogType.RegenerateApiKey | ModLogType.DeleteApiKey,
    key: string
} | {
    logType: ModLogType.CreateGiftCode,
    code: string,
    role: string,
    maxUses: number,
    codeExpiration: Date | null,
    giftDuration: number | null
} | {
    logType: ModLogType.DeleteGiftCode,
    code: string
} | {
    logType: ModLogType.CreateNote | ModLogType.DeleteNote,
    note: string
} | {
    logType: ModLogType.DeleteReport,
    report: string
} | {
    logType: ModLogType.RenameRole,
    names: { old: string, new: string }
} | {
    logType: ModLogType.ToggleRoleIcon,
    role: string,
    roleIcon: boolean
} | {
    logType: ModLogType.ChangeRolePermissions,
    role: string,
    permissions: { added: string[], removed: string[] }
} | {
    logType: ModLogType.SetRoleSku,
    role: string,
    sku: { old: string | null, new: string | null }
} | {
    logType: ModLogType.UnlinkConnection | ModLogType.ResetLinkingCode,
    type: 'discord' | 'email' 
});

export function formatTimestamp(date: Date, style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'f') {
    return `<t:${Math.floor(date.getTime() / 1000 | 0)}:${style}>`;
}

export function sendReportMessage({ user, reporter, tag, reason } : {
    user: GameProfile,
    reporter: GameProfile,
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
        .setTitle('New report!')
        .addFields([
            {
                name: 'Reported player',
                value: user.getFormattedHyperlink()
            },
            {
                name: 'Reported Tag',
                value: `\`\`\`ansi\n${translateToAnsi(tag)}\`\`\``
            },
            {
                name: 'Reporter',
                value: reporter.getFormattedHyperlink()
            },
            {
                name: 'Reason',
                value: `\`\`\`${reason}\`\`\``
            }
        ])
    });
}

export function sendWatchlistAddMessage({ user, tag, word }: { user: GameProfile, tag: string, word: string }) {
    if(!config.discordBot.notifications.watchlist.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.watchlist.channel,
        content: config.discordBot.notifications.watchlist.content,
        embed: new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('New watched player')
        .addFields([
            {
                name: 'Watched player',
                value: user.getFormattedHyperlink()
            },
            {
                name: 'New tag',
                value: `\`\`\`ansi\n${translateToAnsi(tag)}\`\`\``
            },
            {
                name: 'Matched word',
                value: `\`\`\`${word}\`\`\``
            }
        ])
    });
}

export function sendWatchlistTagUpdateMessage(user: GameProfile, tag: string) {
    if(!config.discordBot.notifications.watchlist.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.watchlist.channel,
        content: config.discordBot.notifications.watchlist.content,
        embed: new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
            .setTitle('New tag change')
            .addFields([
                {
                    name: 'Watched player',
                    value: user.getFormattedHyperlink()
                },
                {
                    name: 'New tag',
                    value: `\`\`\`ansi\n${translateToAnsi(tag)}\`\`\``
                }
            ])
    });
}

export function sendBanAppealMessage(user: GameProfile, reason: string) {
    if(!config.discordBot.notifications.banAppeals.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.banAppeals.channel,
        content: config.discordBot.notifications.banAppeals.content,
        embed: new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${user.uuid}.png?size=1024&overlay`)
            .setTitle('New ban appeal')
            .addFields([
                {
                    name: 'Player',
                    value: user.getFormattedHyperlink()
                },
                {
                    name: 'Reason',
                    value: `\`\`\`${reason}\`\`\``
                }
            ])
    });
}

export function sendDiscordLinkMessage(user: GameProfile, userId: string, connected: boolean) {
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
                    value: user.getFormattedHyperlink()
                },
                {
                    name: connected ? 'User ID' : 'Previous User ID',
                    value: `[\`${userId}\`](discord://-/users/${userId})`
                }
            ]),
        actionButton: false
    });
}

export function sendEmailLinkMessage(user: GameProfile, email: string | null, connected: boolean) {
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
                    name: 'Player',
                    value: `[\`${user.username}\`](https://laby.net/@${user.uuid})`
                },
                {
                    name: connected ? 'Email' : 'Previous Email',
                    value: `${email ? `||${email}||` : '**`HIDDEN`**'}`
                }
            ]),
        actionButton: false
    });
}

export function sendReferralMessage(inviter: GameProfile, invited: GameProfile) {
    if(!config.discordBot.notifications.referrals.enabled) return;

    sendMessage({
        channel: config.discordBot.notifications.referrals.channel,
        content: `${inviter.getFormattedHyperlink()} has invited ${inviter.getFormattedHyperlink()}.`,
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

export function sendCustomIconUploadMessage(user: GameProfile, hash: string) {
    if(!config.discordBot.notifications.customIcons.enabled) return;

    const embed = new EmbedBuilder()
        .setColor(bot.colors.standart)
        .setTitle(':frame_photo: New icon upload')
        .setDescription(`Hash: [\`${hash}\`](<${getCustomIconUrl(user.uuid!, hash)}>)`)
        .addFields([
            {
                name: 'Player:',
                value: user.getFormattedHyperlink()
            }
        ])
        .setThumbnail(getCustomIconUrl(user.uuid!, hash));

    sendMessage({
        channel: config.discordBot.notifications.customIcons.channel,
        content: null,
        embed
    });
}

export function sendGiftCodeRedeemMessage(user: GameProfile, code: GiftCode, expiresAt?: Date | null) {
    if(!config.discordBot.notifications.giftCodes.enabled) return;

    const embed = new EmbedBuilder()
        .setColor(bot.colors.standart)
        .setTitle('🎁 Gift code redeemed')
        .addFields([
            {
                name: 'Player:',
                value: user.getFormattedHyperlink(),
                inline: true
            },
            {
                name: 'Gift code:',
                value: `\`\`\`${code.name}\`\`\``,
                inline: true
            },
            {
                name: 'Uses:',
                value: `\`\`\`${code.uses.length}/${code.max_uses}\`\`\``,
                inline: true
            },
            {
                name: 'Gift type:',
                value: `\`\`\`${capitalCase(code.gift.type)}\`\`\``,
                inline: true
            },
            {
                name: 'Gift value:',
                value: `\`\`\`${code.gift.value}\`\`\``,
                inline: true
            },
            {
                name: 'Gift expires:',
                value: `${expiresAt ? `${formatTimestamp(expiresAt)} (${formatTimestamp(expiresAt, 'R')})` : '```-```'}`,
                inline: true
            }
        ]);

    sendMessage({
        channel: config.discordBot.notifications.giftCodes.channel,
        content: null,
        embed,
        actionButton: false
    });
}

export function sendModLogMessage(data: ModLogData) {
    if(!config.discordBot.notifications.mogLog.enabled) return;

    const description = modlogDescription(data);
    sendMessage({
        channel: config.discordBot.notifications.mogLog.channel,
        content: `[**${sentenceCase(ModLogType[data.logType])}**] ${data.staff.getFormattedHyperlink()}${data.discord ? ' [**D**]' : ''}${data.user ? ` → ${data.user.getFormattedHyperlink()}` : ''}${description ? `: ${description}` : ''}`,
        embed: null,
        actionButton: false
    });
}

function modlogDescription(data: ModLogData): string | null {
    const { logType: type } = data;
    if(type == ModLogType.ChangeTag) return `\`${data.tags.old}\` → \`${data.tags.new}\``;
    else if(type == ModLogType.Ban) return `**Reason**: \`${data.reason || 'No reason'}\`. **Appealable**: \`${data.appealable ? `✅` : `❌`}\`. **Expires**: ${data.expires ? `${formatTimestamp(data.expires)} (${formatTimestamp(data.expires, 'R')})` : '`-`'}`;
    else if(type == ModLogType.EditBan) return `**Appealable**: \`${data.appealable ? `✅` : `❌`}\`. **Reason**: \`${data.reason || '-- No reason --'}\``;
    else if(type == ModLogType.AddRole || type == ModLogType.RemoveRole) return `\`${data.role}\``;
    else if(type == ModLogType.EditRoleNote) return `**Role**: \`${data.role}\`. **Note**: \`${data.note || '-'}\``;
    else if(type == ModLogType.SetRoleExpiration) return `**Role**: \`${data.role}\`. **Expires**: ${data.expires ? `${formatTimestamp(data.expires)} (${formatTimestamp(data.expires, 'R')})` : '`-`'}`;
    else if(type == ModLogType.EditPosition) return `\`${capitalCase(data.positions.old)}\` → \`${capitalCase(data.positions.new)}\``;
    else if(type == ModLogType.ChangeIconType) return `\`${capitalCase(data.icons.old)}\` → \`${capitalCase(data.icons.new)}\``;
    else if(type == ModLogType.ClearIconTexture) return `[${data.hash}](${getCustomIconUrl(data.user!.uuid!, data.hash)})`;
    else if(type == ModLogType.CreateApiKey || type == ModLogType.RegenerateApiKey || type == ModLogType.DeleteApiKey) return `**Key name**: \`${data.key}\``;
    else if(type == ModLogType.CreateGiftCode) return `**Name**: \`${data.code}\`. **Role**: \`${data.role}\`. **Max uses**: \`${data.maxUses}\`. **Code expires**: ${data.codeExpiration ? formatTimestamp(data.codeExpiration, 'R') : '`Never`'}. **Gift duration**: \`${data.giftDuration ? data.giftDuration.toString() : 'Permanent'}\``;
    else if(type == ModLogType.DeleteGiftCode) return `\`${data.code}\``;
    else if(type == ModLogType.CreateNote || type == ModLogType.DeleteNote) return `\`${data.note}\``;
    else if(type == ModLogType.DeleteReport) return `\`${data.report}\``;
    else if(type == ModLogType.CreateRole) return `\`${data.role}\``;
    else if(type == ModLogType.RenameRole) return `\`${data.names.old}\` → \`${data.names.new}\``
    else if(type == ModLogType.ToggleRoleIcon) return `\`${data.role}\`. \`${data.roleIcon ? '❌' : '✅'}\` → \`${data.roleIcon ? '✅' : '❌'}\``;
    else if(type == ModLogType.ChangeRolePermissions) return `\`${data.role}\`\n\`\`\`diff\n${data.permissions.added.map((permission) => `+ ${pascalCase(permission)}`).join('\n')}${data.permissions.added.length > 0 && data.permissions.removed.length > 0 ? '\n' : ''}${data.permissions.removed.map((permission) => `- ${pascalCase(permission)}`).join('\n')}\`\`\``;
    else if(type == ModLogType.SetRoleSku) return `**Role**: \`${data.role}\`. **SKU**: \`${data.sku.old || '-'}\` → \`${data.sku.new || '-'}\``;
    else if(type == ModLogType.DeleteRole) return `\`${data.role}\``;
    else if(type == ModLogType.UnlinkConnection || type == ModLogType.ResetLinkingCode) return `**Type**: \`${capitalCase(data.type)}\``;
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
                .setLabel('Actions')
                .setCustomId('actions')
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel('Finish actions')
                .setCustomId('finishAction')
                .setStyle(ButtonStyle.Success),
            )
        ] : []
    });
}