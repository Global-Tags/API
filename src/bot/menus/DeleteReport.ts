import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { getProfileByUUID } from "../../libs/mojang";

export default class DeleteReport extends SelectMenu {
    constructor() {
        super('deleteReport');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageReports)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const report = player.reports.find((report) => report.id == values[0]);
        if(!report) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Report not found!`)], ephemeral: true });
        player.deleteReport(report.id);
        await player.save();

        sendModLogMessage({
            logType: ModLogType.DeleteReport,
            staff: await getProfileByUUID(staff.uuid),
            user: await getProfileByUUID(player.uuid),
            discord: true,
            report: report.reason
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The report was successfully deleted!`)], ephemeral: true });
    }
}