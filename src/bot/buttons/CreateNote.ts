import { ButtonInteraction, CacheType, Message, GuildMember, User, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { config } from "../../libs/config";

export default class CreateNote extends Button {
    constructor() {
        super('createNote');
    }

    public trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
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