const { ButtonInteraction, Message, GuildMember, User, EmbedBuilder } = require("discord.js");

module.exports = {
    id: `watch`,

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
        if(player.watchlist) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is already on the watchlist!`)], ephemeral: true });

        player.watchlist = true;
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.success).setDescription(`✅ The player is not being watched!`)], ephemeral: true });
    }
}