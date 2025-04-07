import { Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendTagChangeEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class SetTagModal extends Modal {
    constructor() {
        super({
            id: 'setTag',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
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
        target.save();

        if(target.isEmailVerified()) {
            sendTagChangeEmail(target.connections.email.address!, oldTag || '---', tag, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The tag was successfully set!')], flags: [MessageFlags.Ephemeral] });
    }
}