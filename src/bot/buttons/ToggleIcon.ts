import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Role, updateRoleCache } from "../../database/schemas/Role";

export default class ToggleIconButton extends Button {
    constructor() {
        super({
            id: 'toggleIcon_',
            requiredPermissions: [Permission.ManagePlayerRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const role = await Role.findOne({ name: interaction.customId.split('_')[1] });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        role.hasIcon = !role.hasIcon;
        await role.save();
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.ToggleRoleIcon,
            staff: await player.getGameProfile(),
            discord: true,
            role: role.name,
            roleIcon: role.hasIcon
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The Icon has been ${role.hasIcon ? 'enabled' : 'disabled'}!`)], flags: [MessageFlags.Ephemeral] });
    }
}