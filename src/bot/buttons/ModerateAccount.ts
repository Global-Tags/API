import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { getProfileByUUID } from "../../libs/game-profiles";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class ModerateAccount extends Button {
    constructor() {
        super('moderateAccount');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageBans) && !staff.hasPermission(Permission.ManageNotes) && !staff.hasPermission(Permission.ManageReports) && !staff.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], ephemeral: true });

        const banInfo = player.isBanned() ? await (async () => {
            const ban = player.bans[0];
            const staff = await getProfileByUUID(ban.staff);
            return `\n> Ban ID: \`${ban.id}\`\n> Ban reason: \`${ban.reason}\`\n> Banned by: [\`${staff.username || staff.uuid}\`](https://laby.net/@${staff.uuid})\n> Banned since: ${formatTimestamp(ban.banned_at)}\n> Expiration date: ${ban.expires_at ? `${formatTimestamp(ban.expires_at)}` : '`-`'}\n> Is ban appealable: \`${ban.appealable ? '✅' : '❌'}\`\n> Was ban appealed: \`${ban.appealed ? '✅' : '❌'}\``;
        })() : '';

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Manage account')
            .setDescription(`> Is on Watchlist: \`${player.watchlist ? '✅' : '❌'}\`\n> Active ban: \`${player.isBanned() ? '✅' : '❌'}\`${banInfo}`)
            .addFields(message.embeds[0].fields[0])
            .setThumbnail(message.embeds[0].thumbnail!.url);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ban')
                    .setCustomId('ban')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!staff.hasPermission(Permission.ManageBans)),
                new ButtonBuilder()
                    .setLabel('Unban')
                    .setCustomId('unban')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!staff.hasPermission(Permission.ManageBans))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Watch')
                    .setCustomId('watch')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!staff.hasPermission(Permission.ManageWatchlist)),
                new ButtonBuilder()
                    .setLabel('Unwatch')
                    .setCustomId('unwatch')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!staff.hasPermission(Permission.ManageWatchlist))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(`Reports${player.reports.length > 0 ? ` (${player.reports.length})` : ''}`)
                    .setCustomId('reports')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!staff.hasPermission(Permission.ManageReports)),
                new ButtonBuilder()
                    .setLabel(`Notes${player.notes.length > 0 ? ` (${player.notes.length})` : ''}`)
                    .setCustomId('notes')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!staff.hasPermission(Permission.ManageNotes))
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}