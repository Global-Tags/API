import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class DeleteNote extends SelectMenu {
    constructor() {
        super('deleteNote');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const note = player.notes.find((note) => note.createdAt.getTime() == parseInt(values[0]));
        if(!note) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Note not found!`)], ephemeral: true });
        player.notes = player.notes.filter((n) => n != note);
        await player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.DeleteNote,
            uuid: player.uuid,
            staff: staff.uuid,
            note: note.text,
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The note was successfully deleted!`)], ephemeral: true });
    }
}