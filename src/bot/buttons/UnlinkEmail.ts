import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { ModLogType, sendEmailLinkMessage, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class UnlinkEmailButton extends Button {
    constructor() {
        super({
            id: 'unlinkEmail_',
            requiredPermissions: [Permission.RemoveConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!target.connections.email.address) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have their email address linked!')], flags: [MessageFlags.Ephemeral] });

        const oldAddress = target.connections.email.address;
        target.connections.email.address = null;
        await target.save();

        const user = await target.getGameProfile();
        sendModLogMessage({
            logType: ModLogType.UnlinkConnection,
            user,
            staff: await player.getGameProfile(),
            discord: true,
            type: 'email'
        });
        sendEmailLinkMessage(user, oldAddress, false);

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The address was successfully unlinked!')], flags: [MessageFlags.Ephemeral] });
    }
}