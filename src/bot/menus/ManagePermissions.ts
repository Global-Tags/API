import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors, images } from "../bot";
import { Permission, permissions as allPermissions } from "../../types/Permission";
import roles, { getCachedRoles, updateRoleCache } from "../../database/schemas/roles";
import { capitalCase } from "change-case";
import { config } from "../../libs/config";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class ManagePermissions extends SelectMenu {
    constructor() {
        super('managePermissions');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });

        const role = await roles.findOne({ name: message.embeds[1].footer!.text});
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], ephemeral: true });

        const permissions = [ ...role.permissions ];
        const added: string[] = [];
        const removed: string[] = [];

        role.permissions = [];
        for(const permission of values) {
            if(!permissions.includes(permission)) added.push(permission);
            if(permission in Permission) role.permissions.push(permission);
        }
        for(const permission of permissions) {
            if(!values.includes(permission)) removed.push(permission);
        }
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.ChangeRolePermissions,
            staff: await getProfileByUUID(staff.uuid),
            discord: true,
            role: role.name,
            permissions: {
                added,
                removed
            }
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role permissions were successfully updated!')], ephemeral: true });
    }
}