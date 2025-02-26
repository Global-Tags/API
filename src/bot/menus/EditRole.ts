import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { formatTimestamp } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class EditRole extends SelectMenu {
    constructor() {
        super('editRole');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = player.getActiveRoles().find(role => role.role.name == values[0]);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Edit role properties')
            .setDescription(`>>> **Note**: \`${role.reason || '-'}\`\n**Expiration**: ${role.expiresAt ? `${formatTimestamp(role.expiresAt)} (${formatTimestamp(role.expiresAt, 'R')})` : '`-`'}`)
            .setFooter({ text: values[0] });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('editRoleNote')
                    .setLabel('Edit note')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('editRoleExpiration')
                    .setLabel('Edit expiration')
                    .setStyle(ButtonStyle.Primary)
            );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}