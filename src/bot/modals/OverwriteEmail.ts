import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class OverwriteEmailModal extends Modal {
    constructor() {
        super({
            id: 'overwriteEmail',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const oldAddress = target.connections.email.address || null;

        target.connections.email.address = fields.getTextInputValue('address').trim();
        target.save();

        sendModLogMessage({
            logType: ModLogType.OverwriteConnection,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            type: 'email',
            value: {
                old: oldAddress,
                new: target.connections.email.address
            }
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The email address was successfully updated!`)], flags: [MessageFlags.Ephemeral] });
    }
}