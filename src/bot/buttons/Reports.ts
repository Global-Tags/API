import { ButtonInteraction, Message, GuildMember, User, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class Reports extends Button {
    constructor() {
        super('reports');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')] });
        if(!staff.hasPermission(Permission.ManageReports)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const reports = [];

        for(const report of player.reports) {
            reports.push(`**${(await GameProfile.getProfileByUUID(report.by)).getUsernameOrUUID()}**: \`${report.reported_tag}\` - \`${report.reason}\` [<t:${report.created_at.getTime() / 1000 | 0}:R>]`);
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Reports')
            .setDescription(reports.length > 0 ? reports.join('\n') : '*This player was never reported*');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Delete report')
                    .setCustomId('deleteReport')
                    .setStyle(ButtonStyle.Danger)
            );

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}