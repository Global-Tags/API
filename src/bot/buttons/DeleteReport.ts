import { ButtonInteraction, Message, GuildMember, User, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { getProfileByUUID } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class DeleteReport extends Button {
    constructor() {
        super('deleteReport');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')] });
        if(!staff.hasPermission(Permission.ManageReports)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });
        if(player.reports.length < 1) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player was never reported!')] });

        const options = [];

        for(const report of player.reports) {
            const { username, uuid } = await getProfileByUUID(report.by);
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${report.reported_tag} - ${report.reason}`.substring(0, 100))
                    .setDescription(`created by ${username || uuid!} on ${report.created_at.toDateString()} (#${report.id})`)
                    .setValue(report.id)
            );
        }

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle('Delete report')
        .setDescription('Please select a report to delete!')
        .addFields(message.embeds[0].fields[0]);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
            .setCustomId('deleteReport')
            .setPlaceholder('Select a report...')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(options.slice(0, 25))
        )

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}