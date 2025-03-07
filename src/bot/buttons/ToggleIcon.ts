import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { Permission } from "../../types/Permission";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import roles, { updateRoleCache } from "../../database/schemas/roles";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { GameProfile } from "../../libs/game-profiles";

export default class ToggleIcon extends Button {
    constructor() {
        super('toggleIcon');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const role = await roles.findOne({ name: message.embeds[1].footer!.text });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        role.hasIcon = !role.hasIcon;
        role.save();
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.ToggleRoleIcon,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            discord: true,
            role: role.name,
            roleIcon: role.hasIcon
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The Icon has been ${role.hasIcon ? 'enabled' : 'disabled'}!`)], flags: [MessageFlags.Ephemeral] });
    }
}