import * as bot from "../bot/bot";
import { ActionRowBuilder, APIMessageTopLevelComponent, ButtonBuilder, ButtonStyle, ContainerBuilder, EmbedBuilder, JSONEncodable, MessageCreateOptions, MessageFlags, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, TopLevelComponentData } from "discord.js";
import { GameProfile } from "./game-profiles";
import { getCustomIconUrl } from "../routes/players/[uuid]/icon";
import { capitalCase, pascalCase, sentenceCase } from "change-case";
import { config } from "./config";
import { stripColors, translateToAnsi } from "./chat-color";
import { GiftCode } from "../database/schemas/gift-codes";
import Logger from "./Logger";

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
    OverwriteConnection,
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
    code: GiftCode
} | {
    logType: ModLogType.DeleteGiftCode,
    code: GiftCode
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
    logType: ModLogType.OverwriteConnection,
    type: 'discord' | 'email',
    value: { old: string | null, new: string }
} | {
    logType: ModLogType.UnlinkConnection | ModLogType.ResetLinkingCode,
    type: 'discord' | 'email' 
});

export const hiddenConnectionLabel = '**`HIDDEN`**';

export function formatTimestamp(date: Date, style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'f') {
    return `<t:${Math.floor(date.getTime() / 1000 | 0)}:${style}>`;
}

export function sendReportMessage({ player, reporter, tag, reason } : {
    player: GameProfile,
    reporter: GameProfile,
    tag: string,
    reason: string
}) {
    if(!config.discordBot.notifications.reports.enabled) return;

    sendEmbed(config.discordBot.notifications.reports.channel, {
        content: config.discordBot.notifications.reports.content,
        embed: new EmbedBuilder()
            .setColor(bot.colors.error)
            .setThumbnail(`https://laby.net/texture/profile/head/${player.uuid}.png?size=1024&overlay`)
            .setTitle('New report!')
            .addFields([
                {
                    name: 'Reported player',
                    value: player.getFormattedHyperlink()
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
            ]),
        targetUUID: player.uuid!!
    });
}

export function sendWatchlistAddMessage({ player, tag, word }: { player: GameProfile, tag: string, word: string }) {
    if(!config.discordBot.notifications.watchlist.enabled) return;

    sendEmbed(config.discordBot.notifications.watchlist.channel, {
        content: config.discordBot.notifications.watchlist.content,
        embed: new EmbedBuilder()
            .setColor(bot.colors.blurple)
            .setThumbnail(`https://laby.net/texture/profile/head/${player.uuid}.png?size=1024&overlay`)
            .setTitle('New watched player')
            .addFields([
                {
                    name: 'Watched player',
                    value: player.getFormattedHyperlink()
                },
                {
                    name: 'New tag',
                    value: `\`\`\`ansi\n${translateToAnsi(tag)}\`\`\``
                },
                {
                    name: 'Matched word',
                    value: `\`\`\`${word}\`\`\``
                }
            ]),
        targetUUID: player.uuid!
    });
}

export function sendWatchlistTagUpdateMessage(player: GameProfile, tag: string) {
    if(!config.discordBot.notifications.watchlist.enabled) return;

    sendEmbed(config.discordBot.notifications.watchlist.channel, {
        content: config.discordBot.notifications.watchlist.content,
        embed: new EmbedBuilder()
            .setColor(bot.colors.blurple)
            .setThumbnail(`https://laby.net/texture/profile/head/${player.uuid}.png?size=1024&overlay`)
            .setTitle('New tag change')
            .addFields([
                {
                    name: 'Watched player',
                    value: player.getFormattedHyperlink()
                },
                {
                    name: 'New tag',
                    value: `\`\`\`ansi\n${translateToAnsi(tag)}\`\`\``
                }
            ]),
        targetUUID: player.uuid!
    });
}

export function sendBanAppealMessage(player: GameProfile, reason: string) {
    if(!config.discordBot.notifications.banAppeals.enabled) return;

    sendEmbed(config.discordBot.notifications.banAppeals.channel, {
        content: config.discordBot.notifications.banAppeals.content,
        embed: new EmbedBuilder()
            .setColor(bot.colors.blurple)
            .setThumbnail(`https://laby.net/texture/profile/head/${player.uuid}.png?size=1024&overlay`)
            .setTitle('New ban appeal')
            .addFields([
                {
                    name: 'Player',
                    value: player.getFormattedHyperlink()
                },
                {
                    name: 'Reason',
                    value: `\`\`\`${reason}\`\`\``
                }
            ]),
        targetUUID: player.uuid!
    });
}

export function sendDiscordLinkMessage(player: GameProfile, userId: string, connected: boolean) {
    if(!config.discordBot.notifications.accountConnections.enabled) return;

    sendEmbed(config.discordBot.notifications.accountConnections.channel, {
        embed: new EmbedBuilder()
            .setColor(bot.colors.blurple)
            .setThumbnail(`https://laby.net/texture/profile/head/${player.uuid}.png?size=1024&overlay`)
            .setTitle(connected ? 'New discord connection' : 'Discord connection removed')
            .addFields([
                {
                    name: 'Player',
                    value: player.getFormattedHyperlink()
                },
                {
                    name: connected ? 'User ID' : 'Previous User ID',
                    value: `[\`${userId}\`](discord://-/users/${userId})`
                }
            ])
    });
}

export function sendEmailLinkMessage(player: GameProfile, email: string | null, connected: boolean) {
    if(!config.discordBot.notifications.accountConnections.enabled) return;

    sendEmbed(config.discordBot.notifications.accountConnections.channel, {
        embed: new EmbedBuilder()
            .setColor(bot.colors.blurple)
            .setThumbnail(`https://laby.net/texture/profile/head/${player.uuid}.png?size=1024&overlay`)
            .setTitle(connected ? 'New email connection' : 'Email connection removed')
            .addFields([
                {
                    name: 'Player',
                    value: `[\`${player.getUsernameOrUUID()}\`](https://laby.net/@${player.getUuidOrUsername()})`
                },
                {
                    name: connected ? 'Email' : 'Previous Email',
                    value: `${email ? `||${email}||` : hiddenConnectionLabel}`
                }
            ])
    });
}

export function sendReferralMessage(inviter: GameProfile, invited: GameProfile) {
    if(!config.discordBot.notifications.referrals.enabled) return;

    sendComponents(config.discordBot.notifications.referrals.channel, {
        components: [new TextDisplayBuilder().setContent(`${inviter.getFormattedHyperlink()} has invited ${invited.getFormattedHyperlink()}.`)]
    });
}

export function sendEntitlementMessage(description: string, uuid?: string) {
    if(!config.discordBot.notifications.entitlements.enabled) return;

    const embed = new EmbedBuilder()
        .setColor(bot.colors.gray)
        .setTitle('💵 Entitlement update')
        .setDescription(description);

    if(uuid) embed.setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`);

    sendEmbed(config.discordBot.notifications.entitlements.channel, { embed });
}

export function sendCustomIconUploadMessage(player: GameProfile, hash: string) {
    if(!config.discordBot.notifications.customIcons.enabled) return;

    sendComponents(config.discordBot.notifications.customIcons.channel, {
        components: [
            new ContainerBuilder().addSectionComponents(
                new SectionBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# :frame_photo: New icon upload'),
                    new TextDisplayBuilder().setContent(`>>> Player: ${player.getFormattedHyperlink()}\nHash: [\`${hash}\`](<${getCustomIconUrl(player.uuid!, hash)}>)`),
                ).setThumbnailAccessory(new ThumbnailBuilder().setURL(getCustomIconUrl(player.uuid!, hash)))
            )
        ],
        targetUUID: player.uuid!
    })
}

export function sendGiftCodeRedeemMessage(player: GameProfile, code: GiftCode, expiresAt?: Date | null) {
    if(!config.discordBot.notifications.giftCodes.enabled) return;

    const embed = new EmbedBuilder()
        .setColor(bot.colors.gray)
        .setTitle('🎁 Gift code redeemed')
        .addFields([
            {
                name: 'Player:',
                value: player.getFormattedHyperlink(),
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
                value: `${expiresAt ? `${formatTimestamp(expiresAt, 'd')}\n(${formatTimestamp(expiresAt, 'R')})` : '```-```'}`,
                inline: true
            }
        ]);

    sendEmbed(config.discordBot.notifications.giftCodes.channel, { embed });
}

export function sendModLogMessage(data: ModLogData) {
    if(!config.discordBot.notifications.mogLog.enabled) return;

    const description = modlogDescription(data);
    sendComponents(config.discordBot.notifications.mogLog.channel, {
        components: [new TextDisplayBuilder().setContent(`[**${sentenceCase(ModLogType[data.logType])}**] ${data.staff.getFormattedHyperlink()}${data.discord ? ' [**D**]' : ''}${data.user ? ` → ${data.user.getFormattedHyperlink()}` : ''}${description ? `: ${description}` : ''}`)]
    });
}

function modlogDescription(data: ModLogData): string | null {
    const { logType: type } = data;
    if(type == ModLogType.ChangeTag) return `\`${stripColors(data.tags.old)}\` → \`${stripColors(data.tags.new)}\``;
    else if(type == ModLogType.Ban) return `**Reason**: \`${data.reason || 'No reason'}\`. **Appealable**: \`${data.appealable ? `✅` : `❌`}\`. **Expires**: ${data.expires ? `${formatTimestamp(data.expires)} (${formatTimestamp(data.expires, 'R')})` : '`-`'}`;
    else if(type == ModLogType.EditBan) return `**Appealable**: \`${data.appealable ? `✅` : `❌`}\`. **Reason**: \`${data.reason || '-- No reason --'}\``;
    else if(type == ModLogType.AddRole || type == ModLogType.RemoveRole) return `\`${data.role}\``;
    else if(type == ModLogType.EditRoleNote) return `**Role**: \`${data.role}\`. **Note**: \`${data.note || '-'}\``;
    else if(type == ModLogType.SetRoleExpiration) return `**Role**: \`${data.role}\`. **Expires**: ${data.expires ? `${formatTimestamp(data.expires)} (${formatTimestamp(data.expires, 'R')})` : '`-`'}`;
    else if(type == ModLogType.EditPosition) return `\`${capitalCase(data.positions.old)}\` → \`${capitalCase(data.positions.new)}\``;
    else if(type == ModLogType.ChangeIconType) return `\`${capitalCase(data.icons.old)}\` → \`${capitalCase(data.icons.new)}\``;
    else if(type == ModLogType.ClearIconTexture) return `[\`${data.hash}\`](<${getCustomIconUrl(data.user!.uuid!, data.hash)}>)`;
    else if(type == ModLogType.CreateApiKey || type == ModLogType.RegenerateApiKey || type == ModLogType.DeleteApiKey) return `**Key name**: \`${data.key}\``;
    else if(type == ModLogType.CreateGiftCode) return `\n>>> **ID**: \`${data.code.id}\`\n**Name**: \`${data.code.name}\`\n**Type**: \`${sentenceCase(data.code.gift.type)}\`\n**Value**: \`${data.code.gift.value}\`\n**Max uses**: \`${data.code.max_uses}\`\n**Code expires**: ${data.code.expires_at ? formatTimestamp(data.code.expires_at, 'R') : '`Never`'}\n**Gift duration**: \`${data.code.gift.duration ? data.code.gift.duration.toString() : 'Permanent'}\``;
    else if(type == ModLogType.DeleteGiftCode) return `\`${data.code.name}\` (\`#${data.code.id}\`)`;
    else if(type == ModLogType.CreateNote || type == ModLogType.DeleteNote) return `\`${data.note}\``;
    else if(type == ModLogType.DeleteReport) return `\`${data.report}\``;
    else if(type == ModLogType.CreateRole) return `\`${data.role}\``;
    else if(type == ModLogType.RenameRole) return `\`${data.names.old}\` → \`${data.names.new}\``
    else if(type == ModLogType.ToggleRoleIcon) return `\`${data.role}\`. \`${data.roleIcon ? '❌' : '✅'}\` → \`${data.roleIcon ? '✅' : '❌'}\``;
    else if(type == ModLogType.ChangeRolePermissions) return `\`${data.role}\`\n\`\`\`diff\n${data.permissions.added.map((permission) => `+ ${pascalCase(permission)}`).join('\n')}${data.permissions.added.length > 0 && data.permissions.removed.length > 0 ? '\n' : ''}${data.permissions.removed.map((permission) => `- ${pascalCase(permission)}`).join('\n')}\`\`\``;
    else if(type == ModLogType.SetRoleSku) return `**Role**: \`${data.role}\`. **SKU**: \`${data.sku.old || '-'}\` → \`${data.sku.new || '-'}\``;
    else if(type == ModLogType.DeleteRole) return `\`${data.role}\``;
    else if(type == ModLogType.OverwriteConnection) {
        const redactValue = data.type == 'email' && config.discordBot.notifications.accountConnections.hideEmails;
        return `**Type**: \`${capitalCase(data.type)}\`. ${redactValue ? hiddenConnectionLabel : data.value.old ? `||${data.value.old}||` : '`-`'} → ${redactValue ? hiddenConnectionLabel : data.value.new ? `||${data.value.new}||` : '`-`'}`;
    }
    else if(type == ModLogType.UnlinkConnection || type == ModLogType.ResetLinkingCode) return `**Type**: \`${capitalCase(data.type)}\``;
    return null;
}

const actionButtonRow = (uuid: string) => new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        new ButtonBuilder()
        .setLabel('Actions')
        .setCustomId(`actions_${uuid}`)
        .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
        .setLabel('Finish actions')
        .setCustomId('finishActions')
        .setStyle(ButtonStyle.Success),
    );

async function sendEmbed(channelId: string, { content, embed, targetUUID } : {
    content?: string,
    embed?: EmbedBuilder,
    targetUUID?: string
}) {
    sendMessage(
        channelId,
        {
            content: content,
            embeds: !embed ? [] : [embed],
            components: targetUUID ? [actionButtonRow(targetUUID)] : []
        }
    );
}

async function sendComponents(channelId: string, { components, targetUUID } : {
    components: (APIMessageTopLevelComponent | JSONEncodable<APIMessageTopLevelComponent> | TopLevelComponentData)[],
    targetUUID?: string,
}) {
    sendMessage(
        channelId,
        {
            components: [
                ...components,
                ...targetUUID ? [actionButtonRow(targetUUID)] : []
            ],
            flags: [MessageFlags.IsComponentsV2]
        }
    );
}

async function sendMessage(channelId: string, options: MessageCreateOptions) {
    if(!config.discordBot.enabled) return;
    const channel = await bot.client.channels.fetch(channelId);
    if(!channel || !channel.isSendable()) return;
    channel.send(options).catch((err) => Logger.error('Failed to send message to discord channel', err));
}