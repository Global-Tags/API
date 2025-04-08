import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendUnbanEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class UnbanButton extends Button {
    constructor() {
        super({
            id: 'unban',
            requiredPermissions: [Permission.ManageBans]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is not banned!')], flags: [MessageFlags.Ephemeral] });

        target.unban();
        target.save();

        sendModLogMessage({
            logType: ModLogType.Unban,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true
        });

        if(target.isEmailVerified()) {
            sendUnbanEmail(target.connections.email.address!, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The player was successfully unbanned!')], flags: [MessageFlags.Ephemeral] });
    }
}