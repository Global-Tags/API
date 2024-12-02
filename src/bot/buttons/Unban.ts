import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Permission } from "../../database/schemas/players";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { sendUnbanEmail } from "../../libs/Mailer";
import { getI18nFunctionByLanguage } from "../../middleware/FetchI18n";

export default class Unban extends Button {
    constructor() {
        super("unban");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageBans)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player is not banned!`)], ephemeral: true });

        player.unban();
        player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.Unban,
            uuid: player.uuid,
            staff: staff.uuid,
            discord: true
        });

        if(player.isEmailVerified()) {
            sendUnbanEmail(player.connections.email.address!, getI18nFunctionByLanguage(player.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The player was successfully unbanned!`)], ephemeral: true });
    }
}