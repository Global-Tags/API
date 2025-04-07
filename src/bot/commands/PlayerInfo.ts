import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember } from "discord.js";
import Command from "../structs/Command";
import players, { Player } from "../../database/schemas/players";
import * as bot from "../bot";
import { translateToAnsi } from "../../libs/chat-color";
import { formatUUID, GameProfile, stripUUID } from "../../libs/game-profiles";
import { capitalCase } from "change-case";
export const uuidRegex = /[a-f0-9]{8}(?:-[a-f0-9]{4}){4}[a-f0-9]{8}|[a-f0-9]{8}(?:[a-f0-9]{4}){4}[a-f0-9]{8}/;

export default class PlayerInfoCommand extends Command {
    constructor() {
        super({
            name: 'playerinfo',
            description: 'Fetches GlobalTag data about a player.',
            options: [
                {
                    name: 'player',
                    description: 'Either the player name or the player\'s minecraft uuid.',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ],
            allowWhenBanned: true
        });
    }

    async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, player: Player | null) {
        await interaction.deferReply();
        let name, uuid = options.getString('player', true);
        if(!uuidRegex.test(uuid)) {
            const profile = await GameProfile.getProfileByUsername(uuid);
            if(!profile.uuid || profile.error) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(`❌ ${profile.error || 'An error ocurred with the request to mojang'}`)] });
            
            name = profile.username;
            uuid = profile.uuid;
        }
        const strippedUUID = stripUUID(uuid);
        const data = await players.findOne({ uuid: strippedUUID });
        const roles = data?.getActiveRoles() || [];

        if(!data) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ This player is not in our records!')] });
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(bot.colors.gray)
                    .setThumbnail(`https://laby.net/texture/profile/head/${strippedUUID}.png?size=1024&overlay`)
                    .setAuthor({ name: formatUUID(uuid) })
                    .setURL(`https://laby.net/${uuid}`)
                    .setTitle(`Playerdata${!!name ? ` of ${name}` : ''}`)
                    .addFields([
                        {
                            name: 'Tag',
                            value: `\`\`\`ansi\n${translateToAnsi((data.isBanned() ? null : data.tag) || '--')}\`\`\``
                        },
                        {
                            name: 'Position',
                            value: `\`\`\`${capitalCase(data.position)}\`\`\``,
                            inline: true
                        },
                        {
                            name: 'Icon',
                            value: `\`\`\`${capitalCase(data.icon.name)}\`\`\``,
                            inline: true
                        },
                        {
                            name: 'Referrals',
                            value: `>>> Total: \`${data.referrals.total.length}\`\nThis month: \`${data.referrals.current_month}\``,
                            inline: true
                        },
                        {
                            name: `Roles [${roles.length}]`,
                            value: `\`\`\`${roles.length > 0 ? roles.map((role) => `- ${capitalCase(role.role.name)}`).join('\n') : '--'}\`\`\``,
                            inline: false
                        }
                    ])
                    .setImage('https://cdn.rappytv.com/bots/placeholder.png')
                    .setFooter({ text: `© RappyTV, ${new Date().getFullYear()}`})
            ],
            components: player && player.canManagePlayers() ? [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Actions')
                            .setCustomId('actions')
                            .setStyle(ButtonStyle.Primary)
                    )
            ] : []
        });
    }
}