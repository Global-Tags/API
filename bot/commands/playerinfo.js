const { CommandInteraction, CommandInteractionOptionResolver, GuildMember, User, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const regex = /[a-f0-9]{8}(?:-[a-f0-9]{4}){4}[a-f0-9]{8}|[a-f0-9]{8}(?:[a-f0-9]{4}){4}[a-f0-9]{8}/;

module.exports = {
    name: `playerinfo`,
    description: `Fetches GlobalTag data about a player.`,
    options: [
        {
            name: `player`,
            description: `Either the player name or the player's minecraft uuid.`,
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ],

    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {CommandInteractionOptionResolver} options 
     * @param {GuildMember} member 
     * @param {User} user 
     */

    async execute(interaction, options, member, user) {
        const resolvable = options.getString(`player`);
        if(!regex.test(resolvable)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ At the moment only uuids are supported!`)], ephemeral: true });
        const data = await server.db.players.findOne({ uuid: resolvable.replaceAll(`-`, ``) });

        if(!data) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is not in our records!`)], ephemeral: true });
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                .setColor(bot.colors.standart)
                .setTitle(`Playerdata`)
                .addFields([
                    {
                        name: `Tag`,
                        value: `\`\`\`${data.ban.active ? `Hidden because user is banned` : translateColors(data.tag) || `--`}\`\`\``
                    },
                    {
                        name: `Position`,
                        value: `\`\`\`${data.position.charAt(0).toUpperCase() + data.position.substring(1).toLowerCase()}\`\`\``
                    },
                    {
                        name: `Icon`,
                        value: `\`\`\`${data.icon.charAt(0).toUpperCase() + data.icon.substring(1).toLowerCase()}\`\`\``
                    },
                    {
                        name: `Admin`,
                        value: `\`\`\`${data.admin ? `Yes` : `No`}\`\`\``
                    },
                    {
                        name: `Banned`,
                        value: `\`\`\`${data.ban.active ? `Yes` : `No`}\`\`\``
                    },
                    {
                        name: `Ban reason`,
                        value: `\`\`\`${data.ban.active ? data.ban.reason || `--` : `--`}\`\`\``
                    }
                ])
            ]
        });
    }
}

/**
 * 
 * @param {string} text 
 * @returns {string}
 */

function translateColors(text) {
    // TODO: Improve with ansi codes
    return text.replace(/(&|§)[0-9A-FK-ORX]/gi, ``);
}