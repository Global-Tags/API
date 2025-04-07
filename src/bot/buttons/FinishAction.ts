import { ButtonInteraction, Message, GuildMember, ActionRowBuilder, EmbedBuilder, ButtonBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class FinishActionButton extends Button {
    constructor() {
        super({
            id: 'finishAction',
            requireDiscordLink: true
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        if(!player.canManagePlayers()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const row = ActionRowBuilder.from(message.components[0] as any) as ActionRowBuilder<ButtonBuilder>;
        row.components.forEach(component => component.setDisabled(true));

        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setFooter({ text: `Processed by ${(await player.getGameProfile()).username || member.user.username}`, iconURL: `https://laby.net/texture/profile/head/${stripUUID(player.uuid)}.png?size=1024&overlay` });

        message.edit({ embeds: [embed], components: [row] });
        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Action completed!')], flags: [MessageFlags.Ephemeral] });
    }
}