import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class UnwatchButton extends Button {
    constructor() {
        super({
            id: 'unwatch_',
            requiredPermissions: [Permission.ManageWatchlistEntries]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.watchlist) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is not on the watchlist!')], flags: [MessageFlags.Ephemeral] });

        target.watchlist = false;
        target.save();

        sendModLogMessage({
            logType: ModLogType.Unwatch,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The player is not being watched anymore!')], flags: [MessageFlags.Ephemeral] });
    }
}