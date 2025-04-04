import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class DeleteNote extends SelectMenu {
    constructor() {
        super({
            id: 'deleteNote',
            requiredPermissions: [Permission.ManageNotes]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const note = target.notes.find((note) => note.id == values[0]);
        if(!note) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Note not found!')], flags: [MessageFlags.Ephemeral] });
        target.deleteNote(note.id);
        await target.save();

        sendModLogMessage({
            logType: ModLogType.DeleteNote,
            staff: await GameProfile.getProfileByUUID(player.uuid),
            user: await GameProfile.getProfileByUUID(target.uuid),
            discord: true,
            note: note.text
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The note was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}