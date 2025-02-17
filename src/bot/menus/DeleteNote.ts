import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class DeleteNote extends SelectMenu {
    constructor() {
        super('deleteNote');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const note = player.notes.find((note) => note.id == values[0]);
        if(!note) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Note not found!')], flags: [MessageFlags.Ephemeral] });
        player.deleteNote(note.id);
        await player.save();

        sendModLogMessage({
            logType: ModLogType.DeleteNote,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            user: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            note: note.text
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The note was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}