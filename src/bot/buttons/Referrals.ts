import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class ReferralsButton extends Button {
    constructor() {
        super({
            id: 'referrals'
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const referrals = [];

        for(const referral of target.referrals.total) {
            const profile = await GameProfile.getProfileByUUID(referral.uuid);
            referrals.push(`- \`${profile.getUsernameOrUUID()}\` (${formatTimestamp(new Date(referral.timestamp), 'R')})`);
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle(`Referral list (${target.referrals.total.length} | ${target.referrals.current_month})`)
            .setDescription(referrals.length > 0 ? referrals.join('\n') : '*This player has never invited anyone*');

        interaction.editReply({ embeds: [embed] });
    }
}