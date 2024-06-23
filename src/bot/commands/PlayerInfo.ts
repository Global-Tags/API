import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import axios from "axios";
import players from "../../database/schemas/players";
import * as bot from "../bot";
import * as config from "../../../config.json";
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
                return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ ${err?.response?.data.errorMessage || `An error ocurred with the request to mojang`}`)], ephemeral: true });
            }
        }
        const data = await players.findOne({ uuid: uuid.replaceAll(`-`, ``) });

        if(!data) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is not in our records!`)] });
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
                        value: `\`\`\`ansi\n${translateColors(data.ban?.active ? `Hidden because user is banned` : data.tag || `--`)}\`\`\``
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
                        value: `\`\`\`ansi\n${translateColors(data.isBanned() ? `&cYes` : `&aNo`)}\`\`\``,
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
            components: !(config.bot.staff as Array<string>).includes(user.id) ? [] : [
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

export function translateColors(text: string): string {
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