import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { onDiscordUnlink } from "../../libs/events";

export default class UnlinkDiscordButton extends Button {
    constructor() {
        super({
            id: 'unlinkDiscord_',
            requiredPermissions: [Permission.RemoveConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have their discord account linked!')], flags: [MessageFlags.Ephemeral] });

        const profile = await target.getGameProfile();
        await onDiscordUnlink(profile, target.connections.discord.id!);

        target.connections.discord.id = null;
        await target.save();

        sendModLogMessage({
            logType: ModLogType.UnlinkConnection,
            user: profile,
            staff: await player.getGameProfile(),
            discord: true,
            type: 'discord'
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The account was successfully unlinked!')], flags: [MessageFlags.Ephemeral] });
    }
}