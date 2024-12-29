import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, User } from "discord.js";
import Command from "../structs/Command";
import { config } from "../../libs/Config";
import { colors, images } from "../bot";
import players from "../../database/schemas/players";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";

export default class RolesCommand extends Command {
    constructor() {
        super(
            'roles',
            'Manage roles',
            []
        )
    }    

    async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        if(!config.discordBot.notifications.accountConnections.enabled) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Account linking is deactivated!`)] });

        const player = await players.findOne({ "connections.discord.id": user.id });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Your account is not linked to a Minecraft account!`)] });
        if(!player.hasPermissionSync(Permission.ManageRoles)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)] });

        const roles = getCachedRoles();

        const header = new EmbedBuilder()
        .setColor(colors.standart)
        .setImage(images.roles);

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle('Manage roles')
        .addFields(roles.slice(0, 25).map((role) => ({
            name: `🎭 ${capitalCase(role.name)} (\`${role.name}\`)`,
            value: `>>> Own icon: \`${role.hasIcon ? '✅' : '❌'}\`\nPermissions: \`${role.getPermissions().length}\``,
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