import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors, images } from "../bot";
import { Permission, permissions as allPermissions } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";
import { config } from "../../libs/config";

export default class ManageRole extends SelectMenu {
    constructor() {
        super('manageRole');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const role = getCachedRoles().find((role) => role.name == values[0]);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const permissions = role.getPermissions();

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Edit **${capitalCase(role.name)}**`)
        .setDescription(`**ID**: \`${role.name}\`\n**Position**: \`${role.position}\`\n**Has Icon**: \`${role.hasIcon ? '✅' : '❌'}\`\n**Metrics admin**: \`${role.name == config.metrics.adminRole ? '✅' : '❌'}\`\n**Permissions** [\`${permissions.length}\`]:\n>>> ${allPermissions.map((permission) => `- ${capitalCase(Permission[permission])}: \`${role.hasPermission(permission) ? '✅' : '❌'}\``).join('\n')}`)
        .setImage(images.placeholder)
        .setFooter({ text: role.name });

        if(role.hasIcon) embed.setThumbnail(config.iconUrl(role.name));

        const components = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Rename')
                .setCustomId('renameRole')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🏷️'),
                new ButtonBuilder()
                .setLabel('Toggle Icon')
                .setCustomId('toggleIcon')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🖼️'),
                new ButtonBuilder()
                .setLabel('Manage permissions')
                .setCustomId('managePermissions')
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel('Delete role')
                .setCustomId('deleteRole')
                .setStyle(ButtonStyle.Danger)
            )
        ];

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components, flags: [MessageFlags.Ephemeral] });
    }
}