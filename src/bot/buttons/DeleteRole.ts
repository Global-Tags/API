import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { Role, updateRoleCache } from "../../database/schemas/Role";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";

export default class DeleteRole extends Button {
    constructor() {
        super({
            id: 'deleteRole',
            requiredPermissions: [Permission.DeleteRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const role = await Role.findOne({ name: interaction.customId.split('_')[1] });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        sendModLogMessage({
            logType: ModLogType.DeleteRole,
            staff: await player.getGameProfile(),
            discord: true,
            role: role
        });

        await role.deleteOne();
        updateRoleCache();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}