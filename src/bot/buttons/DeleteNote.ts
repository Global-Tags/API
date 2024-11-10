import { ButtonInteraction, Message, GuildMember, User, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Permission } from "../../database/schemas/players";
import { getProfileByUUID } from "../../libs/Mojang";

export default class DeleteNote extends Button {
    constructor() {
        super('deleteNote');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)] });
        if(!staff.hasPermissionSync(Permission.ManageNotes)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)] });

        const options = [];

        for(const note of player.notes) {
            const { username, uuid } = await getProfileByUUID(note.author);
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(note.text.substring(0, 100))
                    .setDescription(`created by ${username || uuid!} on ${note.createdAt.toDateString()}`)
                    .setValue(note.createdAt.getTime().toString())
            );
        }

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle('Delete note')
        .setDescription('Please select a note to delete!')
        .addFields(message.embeds[0].fields[0]);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
            .setCustomId('deleteNote')
            .setPlaceholder('Select a note...')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(options.slice(0, 25))
        )

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}