import { ModalSubmitInteraction, Message, ModalSubmitFields, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Modal from "../structs/Modal";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendBanEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import ms, { StringValue } from "ms";

export default class Ban extends Modal {
    constructor() {
        super({
            id: 'ban',
            requiredPermissions: [Permission.ManageBans],
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(target.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is already banned!')], flags: [MessageFlags.Ephemeral] });
        const reason = fields.getTextInputValue('reason');
        const duration = fields.getTextInputValue('duration');
        const expiresAt = duration.trim() != '' ? new Date(Date.now() + ms(duration as StringValue)): null;
        if(expiresAt && isNaN(expiresAt.getTime())) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid expiration date!')], flags: [MessageFlags.Ephemeral] });

        target.banPlayer({
            appealable: true,
            reason,
            staff: player.uuid,
            expiresAt: expiresAt
        });
        target.save();

        sendModLogMessage({
            logType: ModLogType.Ban,
            staff: await GameProfile.getProfileByUUID(player.uuid),
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true,
            appealable: true,
            reason: reason,
            expires: expiresAt
        });

        if(target.isEmailVerified()) {
            sendBanEmail(target.connections.email.address!, reason || '---', getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The player was successfully banned!')], flags: [MessageFlags.Ephemeral] });
    }
}