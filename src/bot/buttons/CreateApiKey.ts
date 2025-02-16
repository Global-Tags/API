import { ButtonInteraction, Message, GuildMember, User, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";

export default class CreateApiKey extends Button {
    constructor() {
        super('createApiKey');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const modal = new ModalBuilder()
            .setTitle('Create API key')
            .setCustomId('createApiKey')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setLabel('Key name')
                            .setCustomId('name')
                            .setPlaceholder('Enter a unique name')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    )
            );

        interaction.showModal(modal);
    }
}