import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import ms, { StringValue } from "ms";

export default class EditRoleExpiration extends Modal {
    constructor() {
        super({ 
            id: 'editRoleExpiration',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const duration = fields.getTextInputValue('duration');
        const expiresAt = duration.trim() != '' ? new Date(Date.now() + ms(duration as StringValue)) : null;
        if(expiresAt && isNaN(expiresAt.getTime())) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid expiration date!')], flags: [MessageFlags.Ephemeral] });
        const name = message.embeds[0].footer!.text;

        if(!target.setRoleExpiration(name, expiresAt)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });
        target.save();

        sendModLogMessage({
            logType: ModLogType.SetRoleExpiration,
            staff: await GameProfile.getProfileByUUID(player.uuid),
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true,
            role: name,
            expires: expiresAt
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The expiration date was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}