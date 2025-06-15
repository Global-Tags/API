import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class RemoveRoleMenu extends SelectMenu {
    constructor() {
        super({
            id: 'removeRole_',
            requiredPermissions: [Permission.ManagePlayerRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const roleName = values[0];
        
        const role = target.getActiveRoles().find(role => role.role.name == roleName);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });
        target.removeRole(role.role.name);
        await target.save();

        sendModLogMessage({
            logType: ModLogType.RemoveRole,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            role: roleName
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role was successfully removed!')], flags: [MessageFlags.Ephemeral] });
    }
}