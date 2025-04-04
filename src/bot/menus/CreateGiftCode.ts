import { StringSelectMenuInteraction, Message, GuildMember, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { Player } from "../../database/schemas/players";
import { Permission } from "../../types/Permission";

export default class CreateGiftCode extends SelectMenu {
    constructor() {
        super({
            id: 'createGiftCode',
            requiredPermissions: [Permission.ManageApiKeys]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();

        const modal = new ModalBuilder()
            .setTitle('Create gift code')
            .setCustomId(`createGiftCode_${values[0]}`)
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setLabel('Name')
                            .setCustomId('name')
                            .setPlaceholder('Enter the name of the gift code')
                            .setMaxLength(30)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    ),
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setLabel('Max uses')
                            .setCustomId('uses')
                            .setPlaceholder('Enter the amount of uses. Default: 1')
                            .setMinLength(1)
                            .setMaxLength(3)
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                    ),
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setLabel('Code duration')
                            .setCustomId('codeDuration')
                            .setPlaceholder('When does the code expire? (e.g. 1d, 1w, 1m, 1y)')
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                    ),
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setLabel('Role duration')
                            .setCustomId('giftDuration')
                            .setPlaceholder('How long does the gift last? (e.g. 1d, 1w, 1m, 1y)')
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                    )
            );
        
        interaction.showModal(modal);
    }
}