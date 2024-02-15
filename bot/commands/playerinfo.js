const { default: axios } = require("axios");
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
        let name, uuid = options.getString(`player`);
        if(!regex.test(uuid)) {
            try {
                const res = await axios({
                    method: `get`,
                    url: `https://api.mojang.com/users/profiles/minecraft/${uuid}`,
                });

                uuid = res.data.id;
                name = res.data.name;
            } catch(err) {
                return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ An error ocurred while fetching the player data. Please try again later or enter a uuid!`)], ephemeral: true });
            }
        }
        const data = await server.db.players.findOne({ uuid: uuid.replaceAll(`-`, ``) });

        if(!data) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is not in our records!`)], ephemeral: true });
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                .setColor(bot.colors.standart)
                .setThumbnail(`https://laby.net/texture/profile/head/${uuid.replaceAll(`-`, ``)}.png?size=1024&overlay`)
                .setTitle(`Playerdata${!!name ? ` of ${name}` : ``}`)
                .addFields([
                    {
                        name: `UUID`,
                        value: `\`\`\`${uuid}\`\`\``
                    },
                    {
                        name: `Tag`,
                        value: `\`\`\`ansi\n${translateColors(data.ban.active ? `Hidden because user is banned` : data.tag || `--`)}\`\`\``
                    },
                    {
                        name: `Position`,
                        value: `\`\`\`${data.position.charAt(0).toUpperCase() + data.position.substring(1).toLowerCase()}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Icon`,
                        value: `\`\`\`${data.icon.charAt(0).toUpperCase() + data.icon.substring(1).toLowerCase()}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Admin`,
                        value: `\`\`\`ansi\n${translateColors(data.admin ? `&aYes` : `&cNo`)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Banned`,
                        value: `\`\`\`ansi\n${translateColors(data.ban.active ? `&cYes` : `&aNo`)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Ban reason`,
                        value: `\`\`\`${data.ban.active ? data.ban.reason || `--` : `--`}\`\`\``,
                        inline: true
                    }
                ])
                .setImage(`https://cdn.rappytv.com/bots/placeholder.png`)
                .setFooter({ text: `© RappyTV, ${new Date().getFullYear()}`})
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
    return text
        .replaceAll(/(&|§)0/gi, `[0;30m`)
        .replaceAll(/(&|§)7/gi, `[0;30m`)
        .replaceAll(/(&|§)8/gi, `[0;30m`)
        .replaceAll(/(&|§)4/gi, `[0;31m`)
        .replaceAll(/(&|§)c/gi, `[0;31m`)
        .replaceAll(/(&|§)2/gi, `[0;32m`)
        .replaceAll(/(&|§)a/gi, `[0;32m`)
        .replaceAll(/(&|§)6/gi, `[0;33m`)
        .replaceAll(/(&|§)e/gi, `[0;33m`)
        .replaceAll(/(&|§)1/gi, `[0;34m`)
        .replaceAll(/(&|§)9/gi, `[0;34m`)
        .replaceAll(/(&|§)5/gi, `[0;35m`)
        .replaceAll(/(&|§)d/gi, `[0;35m`)
        .replaceAll(/(&|§)3/gi, `[0;36m`)
        .replaceAll(/(&|§)b/gi, `[0;36m`)
        .replaceAll(/(&|§)f/gi, `[0;37m`)
        .replaceAll(/(&|§)r/gi, `[0;37m`)
        .replace(/(&|§)[0-9A-FK-ORX]/gi, ``);
}