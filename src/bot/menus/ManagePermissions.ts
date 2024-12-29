import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors, images } from "../bot";
import { Permission, permissions as allPermissions } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";
import { config } from "../../libs/Config";

export default class ManagePermissions extends SelectMenu {
    constructor() {
        super('managePermissions');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Role not found!`)], ephemeral: true });

        role.permissions = [];
        for(const permission of values) {
            if(permission in Permission) role.permissions.push(permission);
        }

        // TODO: Send mod log

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The role permissions were successfully updated!`)], ephemeral: true });
    }
}