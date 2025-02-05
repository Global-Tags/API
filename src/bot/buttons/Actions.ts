import { ButtonInteraction, CacheType, Message, GuildMember, User, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";
import { uuidRegex } from "../commands/PlayerInfo";
import { config } from "../../libs/config";

type InfoEntry = { name: string, value: string };
type Info = { category: string, entries: InfoEntry[] };

export default class Actions extends Button {
    constructor() {
        super('actions');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.canManagePlayers()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        const uuid = message.embeds[0].fields[0].value.replaceAll('`', '').match(uuidRegex)?.[0];
        if(!uuid) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        const strippedUUID = stripUUID(uuid);
        const player = await players.findOne({ uuid: strippedUUID });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const info: Info[] = [];
        const general: InfoEntry[] = [];
        const moderation: InfoEntry[] = [];
        const connections: InfoEntry[] = [];

        if(staff.hasPermission(Permission.ManageTags)) {
            general.push({ name: 'Tag history', value: `\`${player.history.length}\`` });
            moderation.push({ name: 'Tag clears', value: `\`${player.clears.filter(({ type }) => type == 'tag').length}\`` });
            moderation.push({ name: 'Icon clears', value: `\`${player.clears.filter(({ type }) => type == 'icon').length}\`` });
        }
        general.push({ name: 'Language', value: `\`${player.last_language}\`` });
        general.push({ name: 'Hidden role icon', value: `\`${player.hide_role_icon ? '✅' : '❌'}\`` });
        general.push({ name: 'Got referred', value: `\`${player.referrals.has_referred ? '✅' : '❌'}\`` });
        general.push({ name: 'API Keys', value: `\`${player.api_keys.length}\`` });

        if(staff.hasPermission(Permission.ManageNotes)) moderation.push({ name: 'Notes', value: `\`${player.notes.length}\`` });
        if(staff.hasPermission(Permission.ManageReports)) moderation.push({ name: 'Reports', value: `\`${player.reports.length}\`` });
        if(staff.hasPermission(Permission.ManageWatchlist)) moderation.push({ name: 'Is on watchlist', value: `\`${player.watchlist ? '✅' : '❌'}\`` });
        if(staff.hasPermission(Permission.ManageBans)) {
            moderation.push({ name: 'Bans', value: `\`${player.bans.length}\`` });
            moderation.push({ name: 'Active ban', value: `\`${player.isBanned() ? '✅' : '❌'}\`` });
        }

        if(staff.hasPermission(Permission.ManageConnections)) {
            connections.push({ name: 'Discord', value: player.connections.discord.id ? `[\`${player.connections.discord.id}\`](discord://-/users/${player.connections.discord.id})` : '`❌`' });
            connections.push({ name: 'Email', value: player.connections.email.address ? config.discordBot.notifications.accountConnections.hideEmails ? '**`HIDDEN`**' : `\`${player.connections.email.address}\`` : '`❌`' });
        }

        info.push({ category: 'General', entries: general });
        info.push({ category: 'Moderation', entries: moderation });
        info.push({ category: 'Connections', entries: connections });

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${strippedUUID}.png?size=1024&overlay`)
            .setTitle('Action menu')
            .setDescription(info.filter(({ entries }) => entries.length > 0).map(({ category, entries }) =>
                `__${category}__\n${entries.map(({ name, value }) => `> ${name}: ${value}`).join('\n')}`
            ).join('\n\n'))
            .addFields({
                name: 'Target UUID',
                value: `\`\`\`${strippedUUID}\`\`\``
            });

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Account')
                .setCustomId('manageAccount')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermission(Permission.ManageConnections) && !staff.hasPermission(Permission.ManageRoles)),
            new ButtonBuilder()
                .setLabel('Tag Settings')
                .setCustomId('manageTag')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermission(Permission.ManageTags)),
            new ButtonBuilder()
                .setLabel('Moderation')
                .setCustomId('moderateAccount')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermission(Permission.ManageBans) && !staff.hasPermission(Permission.ManageNotes) && !staff.hasPermission(Permission.ManageReports) && !staff.hasPermission(Permission.ManageWatchlist))
        );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}