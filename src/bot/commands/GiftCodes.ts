import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import Command from "../structs/Command";
import { Player } from "../../database/schemas/players";
import { colors, images } from "../bot";
import { Permission } from "../../types/Permission";
import giftCodes from "../../database/schemas/gift-codes";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class GiftCodesCommand extends Command {
    constructor() {
        super({
            name: 'gift-codes',
            description: 'Manage gift codes.',
            requiredPermissions: [Permission.ManageGiftCodes]
        });
    }

    async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, player: Player) {
        const codes = await giftCodes.find();
        const codeMap = codes.filter((code) => code.isValid()).map((code) => 
            `↝ \`${code.name}\` [||**${code.code}**||] - \`${code.uses.length}/${code.max_uses}\` Uses${code.expires_at ? ` (Expires ${formatTimestamp(code.expires_at, 'R')})` : ''}`
        ).join('\n');

        const header = new EmbedBuilder()
            .setColor(colors.gray)
            .setImage(images.giftCodes)

        const embed = new EmbedBuilder()
            .setColor(colors.gray)
            .setTitle('🎁 Gift codes')
            .setDescription(`**Active gift codes**\n${codeMap.length == 0 ? '*No active gift codes.*' : codeMap}`)
            .setImage(images.placeholder);

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

        interaction.reply({ embeds: [header, embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}