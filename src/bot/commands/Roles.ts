import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Command from "../structs/Command";
import { config } from "../../libs/config";
import { colors, images } from "../bot";
import { Player } from "../../database/schemas/players";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";

export default class RolesCommand extends Command {
    constructor() {
        super({
            name: 'roles',
            description: 'Manage roles',
            requiredPermissions: [Permission.ManageRoles]
        });
    }    

    async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const roles = getCachedRoles();

        const header = new EmbedBuilder()
            .setColor(colors.standart)
            .setImage(images.roles);

        const embed = new EmbedBuilder()
            .setColor(colors.standart)
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