import { ButtonInteraction, Message, GuildMember, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class Reports extends Button {
    constructor() {
        super({
            id: 'reports',
            requiredPermissions: [Permission.ManageReports]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const reports = [];

        for(const report of target.reports) {
            reports.push(`**${(await GameProfile.getProfileByUUID(report.by)).getUsernameOrUUID()}**: \`${report.reported_tag}\` - \`${report.reason}\` [${formatTimestamp(report.created_at, 'R')}]`);
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