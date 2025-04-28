import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendIconClearEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";

export default class ClearIconTextureButton extends Button {
    constructor() {
        super({
            id: 'clearIconTexture_',
            requiredPermissions: [Permission.ManageTags]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.icon.hash) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have a custom icon!`)], flags: [MessageFlags.Ephemeral] });
        const oldHash = target.icon.hash;

        target.clearIconTexture(player.uuid);
        await target.save();

        sendModLogMessage({
            logType: ModLogType.ClearIconTexture,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            hash: oldHash
        });

        if(target.isEmailVerified()) {
            sendIconClearEmail(target.connections.email.address!, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The icon texture was successfully reset!')], flags: [MessageFlags.Ephemeral] });
    }
}