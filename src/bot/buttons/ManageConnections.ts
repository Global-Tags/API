import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageConnections extends Button {
    constructor() {
        super('manageConnections');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageConnections)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const uuid = message.embeds[0].author!.name;
        const player = await players.findOne({ uuid: stripUUID(uuid) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage connections')
            .setDescription('Here you can manage the player\'s connections.');

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

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}