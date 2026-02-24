import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendTagChangeEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";

export default class SetTagModal extends Modal {
    constructor() {
        super({
            id: 'setTag_',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        const tag = fields.getTextInputValue('tag').trim();
        const oldTag = target.tag;
        if(tag == oldTag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The tag is already set to this value!')], flags: [MessageFlags.Ephemeral] });

        sendModLogMessage({
            logType: ModLogType.ChangeTag,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            tags: {
                old: target.tag || 'None',
                new: tag
            },
            discord: true
        });

        target.tag = tag;
        target.history.push(tag);
        target.save();

        if(target.isEmailVerified()) {
            sendTagChangeEmail(target.connections.email.address!, oldTag || '---', tag, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The tag was successfully set!')], flags: [MessageFlags.Ephemeral] });
    }
}