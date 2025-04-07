import { ButtonInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { config } from "../../libs/config";
import { Permission } from "../../types/Permission";
import { Player } from "../../database/schemas/players";

export default class CreateNoteButton extends Button {
    constructor() {
        super({
            id: 'createNote',
            requiredPermissions: [Permission.ManageNotes]
        });
    }

    public trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const modal = new ModalBuilder()
        .setTitle('Create note')
        .setCustomId('createNote')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                .setLabel('Note')
                .setCustomId('note')
                .setPlaceholder('Enter the note you want to add')
                .setMaxLength(config.validation.notes.maxLength)
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph)
            )
        )

        interaction.showModal(modal);
    }
}