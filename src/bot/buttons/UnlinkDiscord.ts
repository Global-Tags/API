import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";
import { onDiscordUnlink } from "../../libs/events";

export default class UnlinkDiscordButton extends Button {
    constructor() {
        super({
            id: 'unlinkDiscord',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have their discord account linked!')], flags: [MessageFlags.Ephemeral] });

        const profile = await target.getGameProfile();
        await onDiscordUnlink(await profile, target.connections.discord.id!);

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