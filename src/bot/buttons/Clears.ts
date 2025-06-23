import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { GameProfile } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";
import { formatTimestamp } from "../../libs/discord-notifier";
import { stripColors } from "../../libs/chat-color";
import { getCustomIconUrl } from "../../routes/players/[uuid]/icon";

export default class ClearsButton extends Button {
    constructor() {
        super({
            id: 'clears_',
            requiredPermissions: [Permission.ViewClears]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const clears = [];

        for(const clear of target.clears) {
            clears.push(`**${(await GameProfile.getProfileByUUID(clear.staff)).getUsernameOrUUID()}**: \`${clear.type == 'tag' ? stripColors(clear.currentData) : `[Icon texture](${getCustomIconUrl(target.uuid, clear.currentData)})`}\` [${formatTimestamp(new Date(clear.timestamp), 'R')}]`);
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Clears')
            .setDescription(clears.length > 0 ? clears.join('\n') : '*This player does not have any clears*');

        interaction.editReply({ embeds: [embed] });
    }
}