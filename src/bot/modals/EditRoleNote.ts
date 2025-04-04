import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class EditRoleNote extends Modal {
    constructor() {
        super({
            id: 'editRoleNote',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = target.roles.find((role) => role.name == message.embeds[0].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });
        const profile = await GameProfile.getProfileByUUID(player.uuid);

        let note: string | null = fields.getTextInputValue('note');
        if(note.trim() == '') note = null;

        sendModLogMessage({
            logType: ModLogType.EditRoleNote,
            staff: profile,
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true,
            role: role.name,
            note
        });

        role.reason = note != null ? `${profile.getUsernameOrUUID()}: ${note}` : null;
        target.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The note note was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}