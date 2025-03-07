import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import { getCachedRoles } from "../../database/schemas/roles";
import { config } from "../../libs/config";

export default class RenameRole extends Button {
    constructor() {
        super('renameRole');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
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