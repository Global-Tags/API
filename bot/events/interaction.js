const { Interaction, EmbedBuilder } = require(`discord.js`);

module.exports = {
    name: `interactionCreate`,
    once: false,

    /**
     * 
     * @param {Interaction} interaction 
     */

    async action(interaction) {
        if(interaction.isChatInputCommand()) {
            const { member, user, commandName, options } = interaction;
            const cmd = bot.commands.get(commandName);

            if(!cmd) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ Unknown command!`)], ephemeral: true });

            try {
                cmd.execute(interaction, options, member, user);
            } catch(err) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle(`❌ An error ocurred!`).setDescription(err)], ephemeral: true });
            }
        } else if(interaction.isButton()) {
            const { member, user, customId, message } = interaction;
            const btn = bot.buttons.get(customId);

            if(!btn) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ Unknown button!`)], ephemeral: true });

            try {
                btn.execute(interaction, message, member, user);
            } catch(err) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle(`❌ An error ocurred!`).setDescription(err)], ephemeral: true });
            }
        } else if(interaction.isModalSubmit()) {
            const { member, user, customId, fields, message } = interaction;
            const modal = bot.modals.get(customId);

            if(!modal) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ Unknown modal!`)], ephemeral: true });

            try {
                modal.execute(interaction, message, fields, member, user);
            } catch(err) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle(`❌ An error ocurred!`).setDescription(err)], ephemeral: true });
            }
        }
    }
}