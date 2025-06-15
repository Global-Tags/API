import { ButtonInteraction, Message, GuildMember, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import { Player } from "../../database/schemas/players";

export default class CreateApiKeyButton extends Button {
    constructor() {
        super({
            id: 'createApiKey_',
            requiredPermissions: [Permission.CreateApiKeys]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const modal = new ModalBuilder()
            .setTitle('Create API key')
            .setCustomId(`createApiKey_${interaction.customId.split('_')[1]}`)
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