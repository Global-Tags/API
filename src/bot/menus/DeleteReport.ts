import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";

export default class DeleteReportMenu extends SelectMenu {
    constructor() {
        super({
            id: 'deleteReport_',
            requiredPermissions: [Permission.DeleteReports]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const report = target.reports.find((report) => report.id == values[0]);
        if(!report) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Report not found!')], flags: [MessageFlags.Ephemeral] });
        target.deleteReport(report.id);
        await target.save();

        sendModLogMessage({
            logType: ModLogType.DeleteReport,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            report: `\`${report.reason}\` (\`#${report.id}\`)`
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The report was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}