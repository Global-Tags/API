import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class Unwatch extends Button {
    constructor() {
        super('unwatch');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!player.watchlist) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is not on the watchlist!')], flags: [MessageFlags.Ephemeral] });

        player.watchlist = false;
        player.save();

        sendModLogMessage({
            logType: ModLogType.Unwatch,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            user: await GameProfile.getProfileByUUID(player.uuid),
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The player is not being watched anymore!')], flags: [MessageFlags.Ephemeral] });
    }
}