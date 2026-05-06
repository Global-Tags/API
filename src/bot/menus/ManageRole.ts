import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, parseEmoji } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { PlayerDocument } from "../../libs/database/schemas/Player";
import { colors, images } from "../bot";
import { Permission, permissions as allPermissions } from "../../types/Permission";
import { getCachedRoles } from "../../libs/database/schemas/Role";
import { capitalCase, pascalCase } from "change-case";
import { config } from "../../libs/config";

export default class ManageRoleMenu extends SelectMenu {
    constructor() {
        super({
            id: 'manageRole',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: PlayerDocument) {
        if(values.length == 0) return interaction.deferUpdate();

        const role = getCachedRoles().find((role) => role.name == values[0]);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const permissions = role.getPermissions();

        const embed = new EmbedBuilder()
        .setColor(colors.gray)
        .setTitle(`Edit **${capitalCase(role.name)}**`)
        .setDescription(`**ID**: \`${role.name}\`\n**Position**: \`${role.position}\`\n**Has Icon**: \`${role.hasIcon ? '✅' : '❌'}\`\n**Metrics admin**: \`${role.name == config.metrics.adminRole ? '✅' : '❌'}\`\n**Permissions** [\`${permissions.length}\`]:\n>>> ${allPermissions.map((permission) => `- ${pascalCase(Permission[permission])}: \`${role.hasPermission(permission) ? '✅' : '❌'}\``).join('\n')}`)
        .setImage(images.placeholder)
        .setFooter({ text: role.name });

        if(role.hasIcon) embed.setThumbnail(config.roleIconUrl(role.name));

        const components = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Rename')
                        .setCustomId(`renameRole_${role.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏷️'),
                    new ButtonBuilder()
                        .setLabel('Toggle Icon')
                        .setCustomId(`toggleIcon_${role.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🖼️'),
                    new ButtonBuilder()
                        .setLabel('Manage permissions')
                        .setCustomId(`managePermissions_${role.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔒')
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Set SKU')
                        .setCustomId(`setSku_${role.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💳'),
                    new ButtonBuilder()
                        .setLabel('Delete role')
                        .setCustomId(`deleteRole_${role.name}`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                )
        ];

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components, flags: [MessageFlags.Ephemeral] });
    }
}