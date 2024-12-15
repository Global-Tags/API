import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { Permission } from "../../libs/RoleManager";

export default class EditRoles extends SelectMenu {
    constructor() {
        super('editRoles');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(player.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player is already banned!`)], ephemeral: true });

        const roles = [ ...player.roles ];
        const added: string[] = [];
        const removed: string[] = [];

        player.roles = [];
        for(const role of values) {
            if(!roles.includes(role)) added.push(role);
            player.roles.push(role);
        }
        for(const role of roles) {
            if(!values.includes(role)) removed.push(role);
        }
        await player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.EditRoles,
            uuid: player.uuid,
            staff: staff.uuid,
            roles: {
                added,
                removed
            },
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The players roles were successfully updated!`)], ephemeral: true });
    }
}