const { ButtonInteraction, Message, GuildMember, User, EmbedBuilder } = require("discord.js");

module.exports = {
    id: `clearTag`,

    /**
     * 
     * @param {ButtonInteraction} interaction 
     * @param {Message} message 
     * @param {GuildMember} member 
     * @param {User} user 
     */

    async execute(interaction, message, member, user) {
        const player = await server.db.players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.tag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player does not have a tag!`)], ephemeral: true });

        player.tag = null;
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.success).setDescription(`✅ The tag was successfully deleted!`)], ephemeral: true });
    }
}