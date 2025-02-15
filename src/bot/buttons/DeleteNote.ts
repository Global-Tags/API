import { ButtonInteraction, Message, GuildMember, User, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class DeleteNote extends Button {
    constructor() {
        super('deleteNote');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')] });
        if(!staff.hasPermission(Permission.ManageNotes)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });
        if(player.notes.length < 1) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have any notes!')] });

        const options = [];

        for(const note of player.notes) {
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
                    .setCustomId('deleteNote')
                    .setPlaceholder('Select a note...')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setOptions(options.slice(0, 25))
            );

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}