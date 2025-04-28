import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import codeSchema from "../../database/schemas/gift-codes";

export default class DeleteGiftCodeButton extends Button {
    constructor() {
        super({
            id: 'deleteGiftCode',
            requiredPermissions: [Permission.ManageGiftCodes]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const embed = new EmbedBuilder()
            .setColor(colors.gray)
            .setTitle('Delete gift code')
            .setDescription('Here you can select a gift code to be deleted.');

        const codes = await codeSchema.find();
        const codeMap = codes.filter((code) => code.isValid()).slice(0, 25).map((code) => ({
            value: code.code,
            label: code.name,
            description: `Uses: ${code.uses.length}/${code.max_uses}. Expires at: ${code.expires_at ? code.expires_at.toDateString() : 'Never'}`,
            emoji: '🎁'
        }));

        if(codeMap.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ There are no codes to select!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('deleteGiftCode')
                .setPlaceholder('Select a code to delete...')
                .setMinValues(1)
                .setMaxValues(1)
                .setOptions(codeMap)
            );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}