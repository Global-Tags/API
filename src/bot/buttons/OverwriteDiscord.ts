import { ButtonInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { PlayerDocument } from "../../database/schemas/Player";
import { Permission } from "../../types/Permission";

export default class OverwriteDiscordButton extends Button {
    constructor() {
        super({
            id: 'overwriteDiscord_',
            requiredPermissions: [Permission.ViewConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const modal = new ModalBuilder()
            .setTitle('Overwrite Discord ID')
            .setCustomId(`overwriteDiscord_${interaction.customId.split('_')[1]}`)
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