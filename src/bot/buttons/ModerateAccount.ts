import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { formatTimestamp } from "../../libs/discord-notifier";
import { InfoEntry } from "./Actions";

export default class ModerateAccountButton extends Button {
    constructor() {
        super({
            id: 'moderateAccount',
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

        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const info: InfoEntry[] = [];

        if(player.hasPermission(Permission.ManageWatchlist)) {
            info.push({ name: 'Watchlist', value: `\`${target.watchlist ? '✅' : '❌'}\`` });
        }
        if(player.hasPermission(Permission.ManageBans)) {
            info.push({ name: 'Active ban', value: `\`${target.isBanned() ? '✅' : '❌'}\`` });
            if(target.isBanned()) {
                const ban = target.bans[0];
                info.push({ name: 'Ban ID', value: `\`${ban.id}\`` });
                info.push({ name: 'Ban reason', value: `\`${ban.reason}\`` });
                info.push({ name: 'Banned by', value: `[${(await GameProfile.getProfileByUUID(ban.staff)).getUsernameOrUUID()}](https://laby.net/@${player.uuid})` });
                info.push({ name: 'Banned since', value: `${formatTimestamp(ban.banned_at)}` });
                info.push({ name: 'Expiration date', value: `${ban.expires_at ? `${formatTimestamp(ban.expires_at)}` : '`-`'}` });
                info.push({ name: 'Is ban appealable', value: `\`${ban.appealable ? '✅' : '❌'}\`` });
                info.push({ name: 'Was ban appealed', value: `\`${ban.appealed ? '✅' : '❌'}\`` });
            }
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Moderate account')
            .setDescription(info.length > 0 ? info.map(({ name, value }) => `> ${name}: ${value}`).join('\n') : '*No information available*');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Manage Watchlist')
                        .setCustomId('manageWatchlist')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageWatchlist)),
                    new ButtonBuilder()
                        .setLabel('Manage Bans')
                        .setCustomId('manageBans')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageBans))
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel(`Reports${player.hasPermission(Permission.ManageReports) && target.reports.length > 0 ? ` (${target.reports.length})` : ''}`)
                        .setCustomId('reports')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageReports)),
                    new ButtonBuilder()
                        .setLabel(`Notes${player.hasPermission(Permission.ManageNotes) && target.notes.length > 0 ? ` (${target.notes.length})` : ''}`)
                        .setCustomId('notes')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageNotes)),
                    new ButtonBuilder()
                        .setLabel(`Clears${player.hasPermission(Permission.ManageTags) && target.clears.length > 0 ? ` (${target.clears.length})` : ''}`)
                        .setCustomId('clears')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageTags))
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}