import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import axios from "axios";
import players from "../../database/schemas/players";
import * as bot from "../bot";
import * as config from "../../../config.json";
import { translateToAnsi } from "../../libs/ChatColor";
const regex = /[a-f0-9]{8}(?:-[a-f0-9]{4}){4}[a-f0-9]{8}|[a-f0-9]{8}(?:[a-f0-9]{4}){4}[a-f0-9]{8}/;

export default class PlayerInfo extends Command {
    constructor() {
        super(
            "playerinfo",
            "Fetches GlobalTag data about a player.",
            [
                {
                    name: `player`,
                    description: `Either the player name or the player's minecraft uuid.`,
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        );
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, user: User) {
        await interaction.deferReply();
        let name, uuid = options.getString(`player`)!;
        if(!regex.test(uuid)) {
            try {
                const res = await axios({
                    method: `get`,
                    url: `https://api.mojang.com/users/profiles/minecraft/${uuid}`,
                    headers: {
                        'Accept-Encoding': 'gzip'
                    }
                });

                uuid = res.data.id;
                name = res.data.name;
            } catch(err: any) {
                console.log(`[ERROR] Mojang API error: ${err?.response?.data || `Undefined data`}`);
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ ${err?.response?.data.errorMessage || `An error ocurred with the request to mojang`}`)] });
            }
        }
        const data = await players.findOne({ uuid: uuid.replaceAll(`-`, ``) });

        if(!data) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is not in our records!`)] });
        const staff = await players.findOne({ "connections.discord.id": user.id, admin: true });
        interaction.editReply({
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
                        value: `\`\`\`ansi\n${translateToAnsi(data.ban?.active ? `Hidden because user is banned` : data.tag || `--`)}\`\`\``
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
                        value: `\`\`\`ansi\n${translateToAnsi(data.admin ? `&aYes` : `&cNo`)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Banned`,
                        value: `\`\`\`ansi\n${translateToAnsi(data.isBanned() ? `&cYes` : `&aNo`)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Ban reason`,
                        value: `\`\`\`${data.isBanned() ? data.ban?.reason || `--` : `--`}\`\`\``,
                        inline: true
                    }
                ])
                .setImage(`https://cdn.rappytv.com/bots/placeholder.png`)
                .setFooter({ text: `© RappyTV, ${new Date().getFullYear()}`})
            ],
            components: !!staff ? [] : [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                        .setLabel(`Actions`)
                        .setCustomId(`actions`)
                        .setStyle(ButtonStyle.Primary)
                    )
            ]
        });
    }
}