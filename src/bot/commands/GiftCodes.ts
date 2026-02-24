import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOptionResolver, ContainerBuilder, EmbedBuilder, GuildMember, MediaGalleryBuilder, MessageFlags, SectionBuilder, SeparatorSpacingSize, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import Command from "../structs/Command";
import { PlayerDocument } from "../../database/schemas/Player";
import { images } from "../bot";
import { Permission } from "../../types/Permission";
import { formatTimestamp } from "../../libs/discord-notifier";
import { GiftCode, GiftCodeDocument } from "../../database/schemas/GiftCode";

export default class GiftCodesCommand extends Command {
    constructor() {
        super({
            name: 'gift-codes',
            description: 'Manage gift codes.',
            requiredPermissions: [Permission.ViewGiftCodes]
        });
    }

    async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, player: PlayerDocument) {
        const limit = 30;
        const codes = await GiftCode.find();
        const stringifyCode = (code: GiftCodeDocument) => `↝ \`${code.name}\` [||**${code.code}**||] - \`${code.uses.length}/${code.max_uses}\` Uses${code.expires_at ? ` (Expires ${formatTimestamp(code.expires_at, 'R')})` : ''}`;
        const maps = {
            active: codes.filter((code) => code.isValid()),
            inactive: codes.filter((code) => !code.isValid())
        }

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Create gift code')
                    .setCustomId('createGiftCode')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Delete gift code')
                    .setCustomId('deleteGiftCode')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
            );

        const container = new ContainerBuilder()
            .addMediaGalleryComponents(new MediaGalleryBuilder({ items: [{ media: { url: images.giftCodes } }] }))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Active codes'),
                new TextDisplayBuilder({ content: maps.active.length == 0 ? '*No active gift codes.*' : maps.active.slice(0, limit).map(stringifyCode).join('\n') + (maps.active.length > limit ? `\n*and ${maps.active.length - limit} more...*` : '') })
            )
            .addSeparatorComponents((seperator) => seperator.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Inactive codes'),
                new TextDisplayBuilder({ content: maps.inactive.length == 0 ? '*No inactive gift codes.*' : maps.inactive.slice(0, limit).map(stringifyCode).join('\n') + (maps.inactive.length > limit ? `\n*and ${maps.inactive.length - limit} more...*` : '') })
            )
            .addSeparatorComponents((seperator) => seperator.setDivider(true))
            .addActionRowComponents(row);

        interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
}