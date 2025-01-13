import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { getCachedRoles } from "../../database/schemas/roles";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class ToggleIcon extends Button {
    constructor() {
        super('toggleIcon');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });

        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Role not found!`)], ephemeral: true });

        role.hasIcon = !role.hasIcon;
        role.save();

        sendModLogMessage({
            logType: ModLogType.ToggleRoleIcon,
            staff: await getProfileByUUID(staff.uuid),
            discord: true,
            role: role.name,
            roleIcon: role.hasIcon
        })

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The Icon has been ${role.hasIcon ? 'enabled' : 'disabled'}!`)], ephemeral: true });
    }
}