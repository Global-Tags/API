import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageAccountButton extends Button {
    constructor() {
        super({
            id: 'manageAccount_',
            requireDiscordLink: true
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        if(![
            Permission.ManageConnections,
            Permission.ManageRoles,
            Permission.ManageApiKeys,
            Permission.ManageTags
        ].some((permission) => player.hasPermission(permission))) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage account')
            .setDescription('Here you can manage the player\'s connections and roles.');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Connections')
                        .setCustomId(`manageConnections_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageConnections)),
                    new ButtonBuilder()
                        .setLabel('Roles')
                        .setCustomId(`manageRoles_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageRoles)),
                    new ButtonBuilder()
                        .setLabel('API Keys')
                        .setCustomId(`manageApiKeys_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageApiKeys))
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Tag History')
                        .setCustomId(`tagHistory_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageTags)),
                    new ButtonBuilder()
                        .setLabel('Referrals')
                        .setCustomId(`referrals_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                )
        ]

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}