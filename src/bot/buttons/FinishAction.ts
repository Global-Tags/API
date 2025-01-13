import { ButtonInteraction, CacheType, Message, GuildMember, User, ActionRowBuilder, EmbedBuilder, ButtonBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { stripUUID } from "../../libs/game-profiles";

export default class FinishAction extends Button {
    constructor() {
        super('finishAction');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.canManagePlayers()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });

        const row = ActionRowBuilder.from(message.components[0] as any) as ActionRowBuilder<ButtonBuilder>;
        row.components.forEach(component => component.setDisabled(true));

        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setFooter({ text: `Processed by ${user.username}`, iconURL: `https://laby.net/texture/profile/head/${stripUUID(staff.uuid)}.png?size=1024&overlay` });

        message.edit({ embeds: [embed], components: [row] });
        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Action completed!`)], ephemeral: true });
    }
}