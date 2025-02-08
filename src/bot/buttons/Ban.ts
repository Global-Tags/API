import { ButtonInteraction, CacheType, Message, GuildMember, User, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";

export default class Ban extends Button {
    constructor() {
        super('ban');
    }

    public trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const modal = new ModalBuilder()
            .setTitle('Ban player')
            .setCustomId('ban')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setLabel('Reason')
                            .setCustomId('reason')
                            .setPlaceholder('Enter the reason for the ban')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    ),
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(    
                        new TextInputBuilder()
                            .setLabel('Duration')
                            .setCustomId('duration')
                            .setPlaceholder('6h, 2d, 4w, etc. Leave empty to make it permanent')
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                    )
            )

        interaction.showModal(modal);
    }
}