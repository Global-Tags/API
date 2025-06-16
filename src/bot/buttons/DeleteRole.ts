import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { updateRoleCache } from "../../database/schemas/roles";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import roles from "../../database/schemas/roles";

export default class DeleteRole extends Button {
    constructor() {
        super({
            id: 'deleteRole',
            requiredPermissions: [Permission.DeleteRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const role = await roles.findOne({ name: interaction.customId.split('_')[1] });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        sendModLogMessage({
            logType: ModLogType.DeleteRole,
            staff: await player.getGameProfile(),
            discord: true,
            role: role.name
        });

        await role.deleteOne();
        updateRoleCache();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}