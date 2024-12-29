import { ButtonInteraction, Message, GuildMember, User, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { getProfileByUUID } from "../../libs/Mojang";
import { Permission } from "../../types/Permission";

export default class Reports extends Button {
    constructor() {
        super('reports');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)] });
        if(!staff.hasPermissionSync(Permission.ManageReports)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)] });

        const reports = [];

        for(const report of player.reports) {
            const { username, uuid } = await getProfileByUUID(report.by);
            reports.push(`**${username || uuid}**: \`${report.reported_tag}\` - \`${report.reason}\` [<t:${report.created_at.getTime() / 1000 | 0}:R>]`);
        }

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Reports`)
        .setDescription(reports.length > 0 ? reports.join('\n') : `*This player was never reported*`)
        .addFields(message.embeds[0].fields[0]);

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
            .setLabel('Delete report')
            .setCustomId('deleteReport')
            .setStyle(ButtonStyle.Danger)
        )

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}