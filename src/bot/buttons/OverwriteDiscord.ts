import { ButtonInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { Player } from "../../database/schemas/players";
import { Permission } from "../../types/Permission";

export default class OverwriteDiscordButton extends Button {
    constructor() {
        super({
            id: 'overwriteDiscord',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const modal = new ModalBuilder()
            .setTitle('Overwrite Discord ID')
            .setCustomId('overwriteDiscord')
            .addComponents([
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('id')
                            .setLabel('New ID')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the Discord ID to overwrite')
                            .setRequired(true)
                    )
            ]);
        
        interaction.showModal(modal);
    }
}