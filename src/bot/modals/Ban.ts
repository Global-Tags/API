import { ModalSubmitInteraction, CacheType, Message, ModalSubmitFields, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import Modal from "../structs/Modal";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendBanEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class Ban extends Modal {
    constructor() {
        super('ban');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageBans)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(player.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is already banned!')], flags: [MessageFlags.Ephemeral] });
        const reason = fields.getTextInputValue('reason');

        player.banPlayer({
            appealable: true,
            reason,
            staff: staff.uuid,
            expiresAt: null
        });
        player.save();

        sendModLogMessage({
            logType: ModLogType.Ban,
            staff: await getProfileByUUID(staff.uuid),
            user: await getProfileByUUID(player.uuid),
            discord: true,
            appealable: true,
            reason: reason
        });

        if(player.isEmailVerified()) {
            sendBanEmail(player.connections.email.address!, reason || '---', getI18nFunctionByLanguage(player.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The player was successfully banned!')], flags: [MessageFlags.Ephemeral] });
    }
}