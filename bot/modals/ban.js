const { ModalSubmitInteraction, ModalSubmitFields, GuildMember, User, EmbedBuilder } = require("discord.js");

module.exports = {
    id: `ban`,

    /**
     * 
     * @param {ModalSubmitInteraction} interaction 
     * @param {Message} message 
     * @param {ModalSubmitFields} fields 
     * @param {GuildMember} member 
     * @param {User} user 
     */

    async execute(interaction, message, fields, member, user) {
        const player = await server.db.players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(player.ban.active) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is already banned!`)], ephemeral: true });

        player.ban.active = true;
        player.ban.reason = fields.getTextInputValue(`reason`);
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.success).setDescription(`✅ The player was successfully banned!`)], ephemeral: true });
    }
}