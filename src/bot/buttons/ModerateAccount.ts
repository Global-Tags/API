import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class ModerateAccountButton extends Button {
    constructor() {
        super({
            id: 'moderateAccount',
            requireDiscordLink: true
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        if(!player.hasPermission(Permission.ManageBans) && !player.hasPermission(Permission.ManageNotes) && !player.hasPermission(Permission.ManageReports) && !player.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const banInfo = target.isBanned() ? await (async () => {
            const ban = target.bans[0];
            return `\n> Ban ID: \`${ban.id}\`\n> Ban reason: \`${ban.reason}\`\n> Banned by: [\`${(await GameProfile.getProfileByUUID(ban.staff)).getUsernameOrUUID()}\`](https://laby.net/@${player.uuid})\n> Banned since: ${formatTimestamp(ban.banned_at)}\n> Expiration date: ${ban.expires_at ? `${formatTimestamp(ban.expires_at)}` : '`-`'}\n> Is ban appealable: \`${ban.appealable ? '✅' : '❌'}\`\n> Was ban appealed: \`${ban.appealed ? '✅' : '❌'}\``;
        })() : '';

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage account')
            .setDescription(`> Is on Watchlist: \`${target.watchlist ? '✅' : '❌'}\`\n> Active ban: \`${target.isBanned() ? '✅' : '❌'}\`${banInfo}`);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Ban')
                        .setCustomId('ban')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(!player.hasPermission(Permission.ManageBans)),
                    new ButtonBuilder()
                        .setLabel('Unban')
                        .setCustomId('unban')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!player.hasPermission(Permission.ManageBans))
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Watch')
                        .setCustomId('watch')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(!player.hasPermission(Permission.ManageWatchlist)),
                    new ButtonBuilder()
                        .setLabel('Unwatch')
                        .setCustomId('unwatch')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!player.hasPermission(Permission.ManageWatchlist))
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel(`Reports${target.reports.length > 0 ? ` (${target.reports.length})` : ''}`)
                        .setCustomId('reports')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageReports)),
                    new ButtonBuilder()
                        .setLabel(`Notes${target.notes.length > 0 ? ` (${target.notes.length})` : ''}`)
                        .setCustomId('notes')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!player.hasPermission(Permission.ManageNotes))
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}