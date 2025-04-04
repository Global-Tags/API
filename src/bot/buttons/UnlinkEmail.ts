import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class UnlinkEmail extends Button {
    constructor() {
        super({
            id: 'unlinkEmail',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.connections.email.address) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have their email address linked!')], flags: [MessageFlags.Ephemeral] });

        target.connections.email.address = null;
        await target.save();

        sendModLogMessage({
            logType: ModLogType.UnlinkConnection,
            user: await GameProfile.getProfileByUUID(target.uuid),
            staff: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            type: 'email'
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The address was successfully unlinked!')], flags: [MessageFlags.Ephemeral] });
    }
}