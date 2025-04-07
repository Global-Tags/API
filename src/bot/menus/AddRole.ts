import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class AddRoleMenu extends SelectMenu {
    constructor() {
        super({
            id: 'addRole',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const staffProfile = await GameProfile.getProfileByUUID(player.uuid);
        const roleName = values[0];
        const reason = `Added by ${staffProfile.getUsernameOrUUID()}`;
        
        const { success } = target.addRole({ name: roleName, autoRemove: false, reason })
        if(!success) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is already active!')], flags: [MessageFlags.Ephemeral] });
        await target.save();

        sendModLogMessage({
            logType: ModLogType.AddRole,
            staff: staffProfile,
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true,
            role: roleName
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role was successfully added!')], flags: [MessageFlags.Ephemeral] });
    }
}