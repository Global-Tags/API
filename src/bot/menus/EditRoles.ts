import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class EditRoles extends SelectMenu {
    constructor() {
        super('editRoles');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const staffProfile = await getProfileByUUID(staff.uuid);
        const username = staffProfile.username || staffProfile.uuid;
        const addedAt = new Date();
        const reason = `Added by ${username}`;

        const added: string[] = [];
        const removed: string[] = [];
        
        for(const value of values) {
            const role = player.roles.find(role => role.name == value);
            if(role) {
                if(!role.expires_at || role.expires_at.getTime() < Date.now()) continue;
                role.added_at = addedAt;
                role.expires_at = null;
                role.reason = reason;
            } else {
                player.roles.push({
                    name: value,
                    added_at: addedAt,
                    reason: reason,
                    manually_added: true
                });
            }
            added.push(value);
        }
        for(const role of player.roles.filter((role) => !role.expires_at || role.expires_at.getTime() > Date.now())) {
            if(values.includes(role.name)) continue;
            role.expires_at = new Date();
            removed.push(role.name);
        }
        await player.save();

        sendModLogMessage({
            logType: ModLogType.EditRoles,
            staff: await getProfileByUUID(staff.uuid),
            user: await getProfileByUUID(player.uuid),
            discord: true,
            roles: {
                added,
                removed
            }
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The players roles were successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}