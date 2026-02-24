import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import ms, { StringValue } from "ms";

export default class EditRoleExpirationModal extends Modal {
    constructor() {
        super({ 
            id: 'editRoleExpiration_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const duration = fields.getTextInputValue('duration');
        const expiresAt = duration.trim() != '' ? new Date(Date.now() + ms(duration as StringValue)) : null;
        if(expiresAt && isNaN(expiresAt.getTime())) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid expiration date!')], flags: [MessageFlags.Ephemeral] });
        const name = message.embeds[0].footer!.text;

        if(!target.setRoleExpiration(name, expiresAt)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });
        target.save();

        sendModLogMessage({
            logType: ModLogType.SetRoleExpiration,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            role: name,
            expires: expiresAt
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The expiration date was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}