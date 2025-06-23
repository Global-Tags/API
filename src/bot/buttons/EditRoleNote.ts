import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class EditRoleNoteButton extends Button {
    constructor() {
        super({
            id: 'editRoleNote_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = target.getActiveRoles().find((role) => role.role.name == message.embeds[0].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });

        const input = new TextInputBuilder()
            .setLabel('Note')
            .setCustomId('note')
            .setPlaceholder('Leave empty to remove')
            .setRequired(false)
            .setMaxLength(50)
            .setStyle(TextInputStyle.Short);

        if(role.reason) input.setValue(role.reason);

        interaction.showModal(
            new ModalBuilder()
                .setTitle('Edit role note')
                .setCustomId(`editRoleNote_${target.uuid}`)
                .addComponents(
                    new ActionRowBuilder<TextInputBuilder>()
                        .addComponents(input)
                )
        );
    }
}