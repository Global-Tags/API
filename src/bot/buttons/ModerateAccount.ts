import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ModerateAccountButton extends Button {
    constructor() {
        super({
            id: 'moderateAccount_',
            requireDiscordLink: true
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        if(![
            Permission.ManageBans,
            Permission.ManageNotes,
            Permission.ManageReports,
            Permission.ManageWatchlist,
            Permission.ManageTags
        ].some((permission) => player.hasPermission(permission))) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Moderate account')
            .setDescription('Here you can manage the account of the player.');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Manage Watchlist')
                        .setCustomId(`manageWatchlist_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageWatchlist)),
                    new ButtonBuilder()
                        .setLabel('Manage Bans')
                        .setCustomId(`manageBans_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageBans))
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel(`Reports${player.hasPermission(Permission.ManageReports) && target.reports.length > 0 ? ` (${target.reports.length})` : ''}`)
                        .setCustomId(`reports_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageReports)),
                    new ButtonBuilder()
                        .setLabel(`Notes${player.hasPermission(Permission.ManageNotes) && target.notes.length > 0 ? ` (${target.notes.length})` : ''}`)
                        .setCustomId(`notes_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageNotes)),
                    new ButtonBuilder()
                        .setLabel(`Clears${player.hasPermission(Permission.ManageTags) && target.clears.length > 0 ? ` (${target.clears.length})` : ''}`)
                        .setCustomId(`clears_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageTags))
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}