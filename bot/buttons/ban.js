const { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = {
    id: `ban`,

    /**
     * 
     * @param {ButtonInteraction} interaction 
     * @param {Message} message 
     * @param {GuildMember} member 
     * @param {User} user 
     */

    async execute(interaction, message, member, user) {
        const modal = new ModalBuilder()
        .setTitle(`Ban player`)
        .setCustomId(`ban`)
        .addComponents(
            new ActionRowBuilder()
            .addComponents(
                new TextInputBuilder()
                .setLabel(`Reason`)
                .setCustomId(`reason`)
                .setPlaceholder(`Enter the reason for the ban`)
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
            )
        )

        interaction.showModal(modal);
    }
}