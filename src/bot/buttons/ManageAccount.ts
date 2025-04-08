import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageAccountButton extends Button {
    constructor() {
        super({
            id: 'manageAccount',
            requireDiscordLink: true
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        if(!player.hasPermission(Permission.ManageConnections) && !player.hasPermission(Permission.ManageRoles) && !player.hasPermission(Permission.ManageApiKeys)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage account')
            .setDescription('Here you can manage the player\'s connections and roles.');

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Connections')
                .setCustomId('manageConnections')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!player.hasPermission(Permission.ManageConnections)),
            new ButtonBuilder()
                .setLabel('Roles')
                .setCustomId('manageRoles')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!player.hasPermission(Permission.ManageRoles)),
            new ButtonBuilder()
                .setLabel('API Keys')
                .setCustomId('manageApiKeys')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!player.hasPermission(Permission.ManageApiKeys))
        );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}