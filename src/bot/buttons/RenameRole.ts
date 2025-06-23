import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import { getCachedRoles } from "../../database/schemas/Role";
import { config } from "../../libs/config";
import { Permission } from "../../types/Permission";
import { PlayerDocument } from "../../database/schemas/Player";

export default class RenameRoleButton extends Button {
    constructor() {
        super({
            id: 'renameRole_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const role = getCachedRoles().find((role) => role.name == interaction.customId.split('_')[1]);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const modal = new ModalBuilder()
        .setTitle('Rename role')
        .setCustomId(`renameRole_${role.name}`)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                .setLabel('New name')
                .setCustomId('name')
                .setPlaceholder('Enter the new role name')
                .setValue(role.name)
                .setMaxLength(config.validation.roles.maxLength)
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
            )
        )

        interaction.showModal(modal);
    }
}