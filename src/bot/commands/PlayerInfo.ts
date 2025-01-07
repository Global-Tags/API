import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import players from "../../database/schemas/players";
import * as bot from "../bot";
import { translateToAnsi } from "../../libs/chat-color";
import { getProfileByUsername } from "../../libs/mojang";
import { capitalCase } from "change-case";
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
            const profile = await getProfileByUsername(uuid);
            if(!profile.uuid || profile.error) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ ${profile.error || 'An error ocurred with the request to mojang'}`)] });

            name = profile.username;
            uuid = profile.uuid;
        }
        const data = await players.findOne({ uuid: uuid.replaceAll(`-`, ``) });
        const roles = data?.getRolesSync() || [];

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
                        value: `\`\`\`ansi\n${translateToAnsi((data.ban.active ? null : data.tag) || '--')}\`\`\``
                    },
                    {
                        name: `Position`,
                        value: `\`\`\`${capitalCase(data.position)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Icon`,
                        value: `\`\`\`${capitalCase(data.icon.name)}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Referrals`,
                        value: `\`\`\`${data.referrals.total.length}\`\`\``,
                        inline: true
                    },
                    {
                        name: `Roles [${roles.length}]`,
                        value: `\`\`\`${roles.length > 0 ? roles.map((role) => `- ${capitalCase(role.name)}`).join('\n') : `--`}\`\`\``,
                        inline: false
                    }
                ])
                .setImage(`https://cdn.rappytv.com/bots/placeholder.png`)
                .setFooter({ text: `© RappyTV, ${new Date().getFullYear()}`})
            ],
            components: staff && staff.canManagePlayersSync() ? [
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