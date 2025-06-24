import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class OverwriteEmailModal extends Modal {
    constructor() {
        super({
            id: 'overwriteEmail_',
            requiredPermissions: [Permission.RemoveConnections]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
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