import { ButtonInteraction, Message, GuildMember, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";
import { uuidRegex } from "../commands/PlayerInfo";
import { config } from "../../libs/config";

type InfoEntry = { name: string, value: string };
type Info = { category: string, entries: InfoEntry[] };

export default class ActionsButton extends Button {
    constructor() {
        super({
            id: 'actions',
            requireDiscordLink: true
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        if(!player.canManagePlayers()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        const uuid = message.embeds[0].author?.name || message.embeds[0].fields[0].value.match(uuidRegex)?.[0];
        if(!uuid) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        const strippedUUID = stripUUID(uuid);
        const target = await players.findOne({ uuid: strippedUUID });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const info: Info[] = [];
        const general: InfoEntry[] = [];
        const moderation: InfoEntry[] = [];
        const connections: InfoEntry[] = [];

        if(player.hasPermission(Permission.ManageTags)) {
            general.push({ name: 'Tag history', value: `\`${target.history.length}\`` });
            moderation.push({ name: 'Tag clears', value: `\`${target.clears.filter(({ type }) => type == 'tag').length}\`` });
            moderation.push({ name: 'Icon clears', value: `\`${target.clears.filter(({ type }) => type == 'icon').length}\`` });
        }
        general.push({ name: 'Language', value: `\`${target.last_language}\`` });
        general.push({ name: 'Hidden role icon', value: `\`${target.hide_role_icon ? '✅' : '❌'}\`` });
        general.push({ name: 'Got referred', value: `\`${target.referrals.has_referred ? '✅' : '❌'}\`` });
        if(player.hasPermission(Permission.ManageApiKeys)) general.push({ name: 'API Keys', value: `\`${target.api_keys.length}\`` });

        if(player.hasPermission(Permission.ManageNotes)) moderation.push({ name: 'Notes', value: `\`${target.notes.length}\`` });
        if(player.hasPermission(Permission.ManageReports)) moderation.push({ name: 'Reports', value: `\`${target.reports.length}\`` });
        if(player.hasPermission(Permission.ManageWatchlist)) moderation.push({ name: 'Is on watchlist', value: `\`${target.watchlist ? '✅' : '❌'}\`` });
        if(player.hasPermission(Permission.ManageBans)) {
            moderation.push({ name: 'Bans', value: `\`${target.bans.length}\`` });
            moderation.push({ name: 'Active ban', value: `\`${target.isBanned() ? '✅' : '❌'}\`` });
        }

        if(player.hasPermission(Permission.ManageConnections)) {
            connections.push({ name: 'Discord', value: target.connections.discord.id ? `[\`${target.connections.discord.id}\`](discord://-/users/${target.connections.discord.id})` : '`❌`' });
            connections.push({ name: 'Email', value: target.connections.email.address ? config.discordBot.notifications.accountConnections.hideEmails ? '**`HIDDEN`**' : `\`${target.connections.email.address}\`` : '`❌`' });
        }

        info.push({ category: 'General', entries: general });
        info.push({ category: 'Moderation', entries: moderation });
        info.push({ category: 'Connections', entries: connections });

        const embed = new EmbedBuilder()
            .setColor(colors.blurple)
            .setAuthor({ name: uuid })
            .setThumbnail(`https://laby.net/texture/profile/head/${strippedUUID}.png?size=1024&overlay`)
            .setTitle('Action menu')
            .setDescription(info.filter(({ entries }) => entries.length > 0).map(({ category, entries }) =>
                `__${category}__\n${entries.map(({ name, value }) => `> ${name}: ${value}`).join('\n')}`
            ).join('\n\n'));

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Account')
                    .setCustomId('manageAccount')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!player.hasPermission(Permission.ManageConnections) && !player.hasPermission(Permission.ManageRoles)),
                new ButtonBuilder()
                    .setLabel('Tag Settings')
                    .setCustomId('manageTag')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!player.hasPermission(Permission.ManageTags)),
                new ButtonBuilder()
                    .setLabel('Moderation')
                    .setCustomId('moderateAccount')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!player.hasPermission(Permission.ManageBans) && !player.hasPermission(Permission.ManageNotes) && !player.hasPermission(Permission.ManageReports) && !player.hasPermission(Permission.ManageWatchlist))
            );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}