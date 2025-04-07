import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class ResetDiscordLinkingCodeButton extends Button {
    constructor() {
        super({
            id: 'resetDiscordLinkingCode',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.connections.discord.code) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have a linking code!')], flags: [MessageFlags.Ephemeral] });

        target.connections.discord.code = null;
        await target.save();

        sendModLogMessage({
            logType: ModLogType.ResetLinkingCode,
            user: await GameProfile.getProfileByUUID(target.uuid),
            staff: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            type: 'discord'
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The linking code was successfully reset!')], flags: [MessageFlags.Ephemeral] });
    }
}