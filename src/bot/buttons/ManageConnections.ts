import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageConnections extends Button {
    constructor() {
        super('manageConnections');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageConnections)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Manage connections')
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Unlink Discord')
                    .setCustomId('unlinkDiscord')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!player.connections.discord.id),
                new ButtonBuilder()
                    .setLabel('Reset linking code')
                    .setCustomId('resetDiscordLinkingCode')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!player.connections.discord.code)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Unlink Email')
                    .setCustomId('unlinkEmail')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!player.connections.email.address),
                new ButtonBuilder()
                    .setLabel('Reset linking code')
                    .setCustomId('resetEmailLinkingCode')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!player.connections.email.code)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}