import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import axios from "axios";
import players, { Permission } from "../../database/schemas/players";
import * as bot from "../bot";
import { translateToAnsi } from "../../libs/ChatColor";
export const uuidRegex = /[a-f0-9]{8}(?:-[a-f0-9]{4}){4}[a-f0-9]{8}|[a-f0-9]{8}(?:[a-f0-9]{4}){4}[a-f0-9]{8}/;

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
        if(!uuidRegex.test(uuid)) {
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
        const roles = data?.getRoles() || [];

        if(!data) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ This player is not in our records!`)] });
        const staff = await players.findOne({ "connections.discord.id": user.id });
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                .setColor(bot.colors.standart)
                .setThumbnail(`https://laby.net/texture/profile/head/${uuid.replaceAll(`-`, ``)}.png?size=1024&overlay`)
                .setURL(`https://laby.net/${uuid}`)
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
                        value: `\`\`\`${capitalize(data.position)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Icon`,
                        value: `\`\`\`${capitalize(data.icon)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Referrals`,
                        value: `\`\`\`${data.referrals.length}\`\`\``,
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
                    },
                    {
                        name: `Roles [${roles.length}]`,
                        value: `\`\`\`${roles.length > 0 ? roles.map((role) => `- ${capitalize(role)}`).join('\n') : `--`}\`\`\``,
                        inline: false
                    }
                ])
                .setImage(`https://cdn.rappytv.com/bots/placeholder.png`)
                .setFooter({ text: `© RappyTV, ${new Date().getFullYear()}`})
            ],
            components: staff && staff.hasRoughPermissions() ? [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                        .setLabel(`Actions`)
                        .setCustomId(`actions`)
                        .setStyle(ButtonStyle.Primary)
                    )
            ] : []
        });
    }
}

export function capitalize(text: string): string {
    const parts = text.split('_');
    if(parts.length > 1) {
        const capitalized = [];
        
        for(const part of parts) {
            capitalized.push(capitalize(part));
        }
        return capitalized.join(' ');
    }
    return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
}