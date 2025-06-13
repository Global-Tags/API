import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import Command, { CommandOptions } from "../structs/Command";
import players, { Player } from "../../database/schemas/players";
import * as bot from "../bot";
import { translateToAnsi } from "../../libs/chat-color";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { capitalCase } from "change-case";
import { Permission } from "../../types/Permission";

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

    async execute(interaction: CommandInteraction, options: CommandOptions, member: GuildMember, player: Player | null) {
        const resolvable = options.getString('player', true);

        const or: any[] = [{ uuid: stripUUID(resolvable) }, { uuid: (await GameProfile.getProfileByUsername(resolvable))?.uuid }];
        if(player) {
            if(player.hasPermission(Permission.ManageConnections)) {
                or.push({ 'connections.discord.id': resolvable });
                or.push({ 'connections.email.address': resolvable });
            }
        }
        const data = await players.findOne({ $or: or });
        if(!data) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ This player is not in our records!')] });
        const profile = await data.getGameProfile();
        if(!profile) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ This player does not exist!')] });

        const roles = data.getActiveRoles() || [];

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(bot.colors.gray)
                    .setThumbnail(`https://laby.net/texture/profile/head/${profile.uuid}.png?size=1024&overlay`)
                    .setURL(`https://laby.net/${profile.uuid}`)
                    .setTitle(`Playerdata of ${profile.getUsernameOrUUID()}`)
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
                            .setCustomId(`actions_${data.uuid}`)
                            .setStyle(ButtonStyle.Primary)
                    )
            ] : [],
            flags: [data.connections.discord.id, data.connections.email.address].some((connection) => connection === resolvable) ? [MessageFlags.Ephemeral] : []
        });
    }
}