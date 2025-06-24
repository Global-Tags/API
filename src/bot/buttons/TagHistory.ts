import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { Permission } from "../../types/Permission";
import { stripColors } from "../../libs/chat-color";
import { config } from "../../libs/config";

export default class TagHistoryButton extends Button {
    constructor() {
        super({
            id: 'tagHistory_',
            requiredPermissions: [Permission.ViewTagHistory]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const tags = [];

        for(let i = 0; i < target.history.length; i++) {
            const tag = stripColors(target.history[i]);
            tags.push(`**${i + 1}.** \`${tag.length > 0 ? tag : '---'}\`${config.validation.tag.watchlist.some((word) => tag.includes(word)) ? ' (⚠️)' : ''}`);
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Tag history')
            .setDescription(tags.length > 0 ? tags.join('\n') : '*This player has never had a tag*');

        interaction.editReply({ embeds: [embed] });
    }
}