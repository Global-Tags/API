import { ButtonInteraction, Message, GuildMember, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { GameProfile } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class DeleteNoteButton extends Button {
    constructor() {
        super({
            id: 'deleteNote_',
            requiredPermissions: [Permission.DeleteNotes]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });
        if(target.notes.length < 1) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have any notes!')] });

        const options = [];

        for(const note of target.notes) {
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(note.text.substring(0, 100))
                    .setDescription(`created by ${(await GameProfile.getProfileByUUID(note.author)).getUsernameOrUUID()} on ${note.createdAt.toDateString()} (#${note.id})`)
                    .setValue(note.id)
            );
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Delete note')
            .setDescription('Please select a note to delete!');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`deleteNote_${target.uuid}`)
                    .setPlaceholder('Select a note...')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setOptions(options.slice(0, 25))
            );

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}