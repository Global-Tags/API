import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageTag extends Button {
    constructor() {
        super('manageTag');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Manage tag')
        .setDescription('Here you can edit the player\'s tag, position and icon.')
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Change tag')
                .setCustomId('setTag')
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel('Clear tag')
                .setCustomId('clearTag')
                .setStyle(ButtonStyle.Danger)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Set position')
                .setCustomId('setPosition')
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel('Manage icon')
                .setCustomId('manageIcon')
                .setStyle(ButtonStyle.Primary)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}