import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class Watch extends Button {
    constructor() {
        super({
            id: 'watch',
            requiredPermissions: [Permission.ManageWatchlist]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(target.watchlist) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is already on the watchlist!')], flags: [MessageFlags.Ephemeral] });

        target.watchlist = true;
        target.save();

        sendModLogMessage({
            logType: ModLogType.Watch,
            staff: await GameProfile.getProfileByUUID(player.uuid),
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The player is now being watched!')], flags: [MessageFlags.Ephemeral] });
    }
}