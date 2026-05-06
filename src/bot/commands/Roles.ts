import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, GuildMember, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Command, { CommandOptions } from "../structs/Command";
import { config } from "../../libs/config";
import { colors, images } from "../bot";
import { PlayerDocument } from "../../libs/database/schemas/Player";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../libs/database/schemas/Role";
import { capitalCase } from "change-case";

export default class RolesCommand extends Command {
    constructor() {
        super({
            name: 'roles',
            description: 'Manage roles',
            requiredPermissions: [Permission.ViewRoles]
        });
    }    

    async execute(interaction: CommandInteraction, options: CommandOptions, member: GuildMember, player: PlayerDocument) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const roles = getCachedRoles();

        const header = new EmbedBuilder()
            .setColor(colors.gray)
            .setImage(images.roles);

        const embed = new EmbedBuilder()
            .setColor(colors.gray)
            .setTitle('Manage roles')
            .addFields(roles.slice(0, 25).map((role) => ({
                name: `🎭 ${capitalCase(role.name)} (\`${role.name}\`)`,
                value: `>>> Own icon: \`${role.hasIcon ? '✅' : '❌'}\`\nMetrics admin: \`${role.name == config.metrics.adminRole ? '✅' : '❌'}\`\nPermissions: \`${role.getPermissions().length}\``,
                inline: true
            })))
            .setImage(images.placeholder)
            .setFooter({ text: 'This menu only shows the first 25 roles.' });

        const components = [
            new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('manageRole')
                        .setMinValues(0)
                        .setMaxValues(1)
                        .setPlaceholder('Select a role to manage')
                        .setOptions(roles.map((role) => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(capitalCase(role.name))
                                .setDescription(`Manage '${role.name}'`)
                                .setValue(role.name)
                                .setEmoji('🎭')
                        ))
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Create role')
                        .setCustomId('createRole')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('➕')
                )
        ];

        interaction.editReply({ embeds: [header, embed], components });
    }
}