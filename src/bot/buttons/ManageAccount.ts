import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageAccount extends Button {
    constructor() {
        super('manageAccount');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageConnections) && !staff.hasPermission(Permission.ManageRoles) && !staff.hasPermission(Permission.ManageSubscriptions)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Manage account')
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Connections')
                .setCustomId('manageConnections')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermission(Permission.ManageConnections)),
            new ButtonBuilder()
                .setLabel('Roles')
                .setCustomId('editRoles')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermission(Permission.ManageRoles)),
            new ButtonBuilder()
                .setLabel('Subscriptions')
                .setCustomId('manageSubscriptions')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermission(Permission.ManageSubscriptions))
        );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}