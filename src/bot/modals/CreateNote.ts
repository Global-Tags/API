import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class CreateNote extends Modal {
    constructor() {
        super({
            id: 'createNote',
            requiredPermissions: [Permission.ManageNotes]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        const note = fields.getTextInputValue('note');

        sendModLogMessage({
            logType: ModLogType.CreateNote,
            staff: await GameProfile.getProfileByUUID(player.uuid),
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true,
            note
        });

        target.createNote({
            text: note,
            author: player.uuid
        });
        target.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The note was successfully added!')], flags: [MessageFlags.Ephemeral] });
    }
}