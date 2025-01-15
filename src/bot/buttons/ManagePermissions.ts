import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from "discord.js";
import Button from "../structs/Button";
import { Permission, permissions } from "../../types/Permission";
import players from "../../database/schemas/players";
import { colors, images } from "../bot";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";

export default class ManagePermissions extends Button {
    constructor() {
        super('managePermissions');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });

        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Select roles for \`${role.name}\``)
        .setImage(images.placeholder)
        .setFooter({ text: role.name });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents([
            new StringSelectMenuBuilder()
            .setCustomId('managePermissions')
            .setMinValues(0)
            .setMaxValues(Math.min(25, permissions.length))
            .setPlaceholder('Select the permissions...')
            .setOptions(permissions.slice(0, 25).map((permission) => {
                return {
                    label: capitalCase(Permission[permission]),
                    value: Permission[permission],
                    default: role.hasPermission(permission)
                }
            }))
        ]);

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components: [row], ephemeral: true });
    }
}