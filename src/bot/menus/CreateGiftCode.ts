import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class CreateGiftCode extends SelectMenu {
    constructor() {
        super('createGiftCode');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageApiKeys)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

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