const { ButtonInteraction, Message, GuildMember, User, ActionRowBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    id: `finishAction`,

    /**
     * 
     * @param {ButtonInteraction} interaction 
     * @param {Message} message 
     * @param {GuildMember} member 
     * @param {User} user 
     */

    async execute(interaction, message, member, user) {
        const row = ActionRowBuilder.from(message.components[0]);
        row.components.forEach(component => component.setDisabled(true));

        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setFooter({ text: `Processed by ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

        message.edit({ embeds: [embed], components: [row] });
        interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.success).setDescription(`✅ Action completed!`)], ephemeral: true });
    }
}