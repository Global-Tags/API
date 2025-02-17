import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageApiKeys extends Button {
    constructor() {
        super('manageApiKeys');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageApiKeys)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage API keys')
            .setDescription('Here you can manage the player\'s API keys.');

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Create Key')
                .setCustomId('createApiKey')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel('Regenerate Key')
                .setCustomId('regenerateApiKey')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setLabel('Delete Key')
                .setCustomId('deleteApiKey')
                .setStyle(ButtonStyle.Danger)
        );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}