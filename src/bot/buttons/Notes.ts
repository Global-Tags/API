import { ButtonInteraction, Message, GuildMember, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { GameProfile } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class NotesButton extends Button {
    constructor() {
        super({
            id: 'notes_',
            requiredPermissions: [Permission.ViewNotes]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const notes = [];

        for(const note of target.notes) {
            notes.push(`**${(await GameProfile.getProfileByUUID(note.author)).getUsernameOrUUID()}**: \`${note.text}\` [${formatTimestamp(note.createdAt, 'R')}]`);
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Notes')
            .setDescription(notes.length > 0 ? notes.join('\n') : '*This player does not have any notes*');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Create note')
                    .setCustomId(`createNote_${target.uuid}`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Delete note')
                    .setCustomId(`deleteNote_${target.uuid}`)
                    .setStyle(ButtonStyle.Danger)
            );

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}