import { ButtonInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { Player } from "../../database/schemas/players";
import { Permission } from "../../types/Permission";

export default class OverwriteEmailButton extends Button {
    constructor() {
        super({
            id: 'overwriteEmail_',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const modal = new ModalBuilder()
            .setTitle('Overwrite email address')
            .setCustomId(`overwriteEmail_${interaction.customId.split('_')[1]}`)
            .addComponents([
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('address')
                            .setLabel('New address')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the email address to overwrite')
                            .setRequired(true)
                    )
            ]);
        
        interaction.showModal(modal);
    }
}