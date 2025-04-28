import { ButtonInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import { Player } from "../../database/schemas/players";

export default class BanButton extends Button {
    constructor() {
        super({
            id: 'ban_',
            requiredPermissions: [Permission.ManageBans]
        });
    }

    public trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const modal = new ModalBuilder()
            .setTitle('Ban player')
            .setCustomId(`ban_${interaction.customId.split('_')[1]}`)
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