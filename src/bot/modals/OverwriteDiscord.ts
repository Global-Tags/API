import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class OverwriteDiscordModal extends Modal {
    constructor() {
        super({
            id: 'overwriteDiscord',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const oldId = target.connections.discord.id || null;

        target.connections.discord.id = fields.getTextInputValue('id').trim();
        target.save();

        sendModLogMessage({
            logType: ModLogType.OverwriteConnection,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            type: 'discord',
            value: {
                old: oldId,
                new: target.connections.discord.id
            }
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The Discord ID was successfully updated!`)], flags: [MessageFlags.Ephemeral] });
    }
}