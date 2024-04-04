import { ButtonInteraction, CacheType, Message, GuildMember, User, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ActionRow } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";

export default class FinishAction extends Button {
    constructor() {
        super("finishAction");
    }

    public trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const row = ActionRowBuilder.from(message.components[0] as any) as ActionRowBuilder<ButtonBuilder>;
        row.components.forEach(component => component.setDisabled(true));

        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setFooter({ text: `Processed by ${user.username}`, iconURL: user.displayAvatarURL() });

        message.edit({ embeds: [embed], components: [row] });
        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Action completed!`)], ephemeral: true });
    }
}