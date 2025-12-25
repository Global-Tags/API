import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class ResetEmailLinkingCodeButton extends Button {
    constructor() {
        super({
            id: 'resetEmailLinkingCode_',
            requiredPermissions: [Permission.RemoveConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.connections.email.code) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have a linking code!')], flags: [MessageFlags.Ephemeral] });

        target.connections.email.code = null;
        await target.save();

        sendModLogMessage({
            logType: ModLogType.ResetLinkingCode,
            user: await target.getGameProfile(),
            staff: await player.getGameProfile(),
            discord: true,
            type: 'email'
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The linking code was successfully reset!')], flags: [MessageFlags.Ephemeral] });
    }
}