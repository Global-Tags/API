import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class AddRole extends SelectMenu {
    constructor() {
        super('addRole');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const staffProfile = await GameProfile.getProfileByUUID(staff.uuid);
        const roleName = values[0];
        const addedAt = new Date();
        const reason = `Added by ${staffProfile.getUsernameOrUUID()}`;
        
        const role = player.roles.find(role => role.name == roleName);
        if(role) {
            if(!role.expires_at || role.expires_at.getTime() > Date.now()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is already active!')], flags: [MessageFlags.Ephemeral] });
            role.added_at = addedAt;
            role.expires_at = null;
            role.reason = reason;
        } else {
            player.roles.push({
                name: roleName,
                added_at: addedAt,
                reason: reason,
                manually_added: true
            });
        }
        await player.save();

        sendModLogMessage({
            logType: ModLogType.AddRole,
            staff: staffProfile,
            user: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            role: roleName
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role was successfully added!')], flags: [MessageFlags.Ephemeral] });
    }
}