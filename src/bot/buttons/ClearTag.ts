import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendTagClearEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";

export default class ClearTagButton extends Button {
    constructor() {
        super({
            id: 'clearTag_',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.tag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have a tag!')], flags: [MessageFlags.Ephemeral] });
        const oldTag = target.tag;

        target.clearTag(player.uuid);
        await target.save();

        sendModLogMessage({
            logType: ModLogType.ClearTag,
            user: await target.getGameProfile(),
            staff: await player.getGameProfile(),
            discord: true
        });

        if(target.isEmailVerified()) {
            sendTagClearEmail(target.connections.email.address!, oldTag, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The tag was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}