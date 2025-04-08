import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import { getCachedRoles } from "../../database/schemas/roles";
import { config } from "../../libs/config";
import { Permission } from "../../types/Permission";
import { Player } from "../../database/schemas/players";

export default class RenameRoleButton extends Button {
    constructor() {
        super({
            id: 'renameRole',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const modal = new ModalBuilder()
        .setTitle('Rename role')
        .setCustomId('renameRole')
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