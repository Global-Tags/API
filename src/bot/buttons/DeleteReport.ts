import { ButtonInteraction, Message, GuildMember, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { GameProfile } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class DeleteReportButton extends Button {
    constructor() {
        super({
            id: 'deleteReport_',
            requiredPermissions: [Permission.DeleteReports]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });
        if(target.reports.length < 1) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player was never reported!')] });

        const options = [];

        for(const report of target.reports) {
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${report.reported_tag} - ${report.reason}`.substring(0, 100))
                    .setDescription(`created by ${(await GameProfile.getProfileByUUID(report.by)).getUsernameOrUUID()} on ${report.created_at.toDateString()} (#${report.id})`)
                    .setValue(report.id)
            );
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Delete report')
            .setDescription('Please select a report to delete!');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`deleteReport_${target.uuid}`)
                    .setPlaceholder('Select a report...')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setOptions(options.slice(0, 25))
            );

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}