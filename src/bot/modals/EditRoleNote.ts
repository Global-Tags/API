import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class EditRoleNoteModal extends Modal {
    constructor() {
        super({
            id: 'editRoleNote_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const name = message.embeds[0].footer!.text;
        let note: string | null = fields.getTextInputValue('note');
        if(note.trim() == '') note = null;

        if(!target.setRoleNote(name, note)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });
        target.save();

        const profile = await player.getGameProfile();

        sendModLogMessage({
            logType: ModLogType.EditRoleNote,
            staff: profile,
            user: await target.getGameProfile(),
            discord: true,
            role: name,
            note
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The note note was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}