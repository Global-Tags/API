import { ButtonInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { config } from "../../libs/config";
import { Permission } from "../../types/Permission";
import { PlayerDocument } from "../../database/schemas/Player";

export default class CreateRoleButton extends Button {
    constructor() {
        super({
            id: 'createRole',
            requiredPermissions: [Permission.CreateRoles]
        });
    }

    public trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const modal = new ModalBuilder()
        .setTitle('Create role')
        .setCustomId('createRole')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                .setLabel('Name')
                .setCustomId('name')
                .setPlaceholder('Enter the role name')
                .setMaxLength(config.validation.roles.maxLength)
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
            )
        )

        interaction.showModal(modal);
    }
}