const { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ButtonStyle, ButtonBuilder } = require("discord.js");

module.exports = {
    id: `actions`,

    /**
     * 
     * @param {ButtonInteraction} interaction 
     * @param {Message} message 
     * @param {GuildMember} member 
     * @param {User} user 
     */

    async execute(interaction, message, member, user) {
        if(!bot.cfg.staff.includes(user.id)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ You don't have permissions!`)], ephemeral: true });
        const uuid = message.embeds[0].fields[0].value.replaceAll(`\``, ``);

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
        .setTitle(`Action menu`)
        .addFields({
            name: `Target UUID`,
            value: `\`\`\`${uuid}\`\`\``
        });

        const rows = [
            new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Watch`)
                .setCustomId(`watch`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Unwatch`)
                .setCustomId(`unwatch`)
                .setStyle(ButtonStyle.Primary)
            ),
            new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Ban`)
                .setCustomId(`ban`)
                .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                .setLabel(`Clear tag`)
                .setCustomId(`clearTag`)
                .setStyle(ButtonStyle.Danger)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}