import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import roles, { updateRoleCache } from "../../database/schemas/roles";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { GameProfile } from "../../libs/game-profiles";

export default class ManagePermissionsMenu extends SelectMenu {
    constructor() {
        super({
            id: 'managePermissions',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();

        const role = await roles.findOne({ name: message.embeds[1].footer!.text });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const permissions = [...role.permissions];
        const added: string[] = [];
        const removed: string[] = [];

        for(const permission of values) {
            if(!permissions.includes(permission)) added.push(permission);
        }
        for(const permission of permissions) {
            if(!values.includes(permission)) removed.push(permission);
        }
        role.permissions = values.filter(permission => Object.values(Permission).includes(permission));
        await role.save();
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.ChangeRolePermissions,
            staff: await player.getGameProfile(),
            discord: true,
            role: role.name,
            permissions: {
                added,
                removed
            }
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role permissions were successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}