import { ButtonInteraction, Message, GuildMember, User, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { getProfileByUUID } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class Notes extends Button {
    constructor() {
        super('notes');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')] });
        if(!staff.hasPermission(Permission.ManageNotes)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const notes = [];

        for(const note of player.notes) {
            const { username, uuid } = await getProfileByUUID(note.author);
            notes.push(`**${username || uuid}**: \`${note.text}\` [<t:${note.createdAt.getTime() / 1000 | 0}:R>]`);
        }

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Notes`)
        .setDescription(notes.length > 0 ? notes.join('\n') : `*This player does not have any notes*`)
        .addFields(message.embeds[0].fields[0]);

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
            .setLabel('Create note')
            .setCustomId('createNote')
            .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
            .setLabel('Delete note')
            .setCustomId('deleteNote')
            .setStyle(ButtonStyle.Danger)
        )

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}