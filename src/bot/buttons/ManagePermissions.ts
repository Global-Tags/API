import { ButtonInteraction, Message, GuildMember, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { Permission, permissions } from "../../types/Permission";
import { Player } from "../../database/schemas/players";
import { colors, images } from "../bot";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";

export default class ManagePermissionsButton extends Button {
    constructor() {
        super({
            id: 'managePermissions',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
        .setColor(colors.gray)
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
                    .setOptions(permissions.slice(0, 25).map((permission) => ({
                        label: capitalCase(Permission[permission]),
                        value: Permission[permission],
                        default: role.hasPermission(permission)
                    })))
            ]);

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}