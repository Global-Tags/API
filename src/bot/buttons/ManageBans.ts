import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class ManageBansButton extends Button {
    constructor() {
        super({
            id: 'manageBans',
            requiredPermissions: [Permission.ManageBans]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const banInfo = target.isBanned() ? await (async () => {
            const ban = target.bans[0];
            return `\n> Ban ID: \`${ban.id}\`\n> Ban reason: \`${ban.reason}\`\n> Banned by: [\`${(await GameProfile.getProfileByUUID(ban.staff)).getUsernameOrUUID()}\`](https://laby.net/@${player.uuid})\n> Banned since: ${formatTimestamp(ban.banned_at)}\n> Expiration date: ${ban.expires_at ? `${formatTimestamp(ban.expires_at)}` : '`-`'}\n> Is ban appealable: \`${ban.appeal.appealable ? '✅' : '❌'}\`\n> Ban appeal: ${ban.appeal.appealed ? `\`${ban.appeal.reason || 'Unknown reason'}\` (${ban.appeal.appealed_at ? formatTimestamp(ban.appeal.appealed_at, 'd') : '`Unknown date`'})` : '`--`'}`;
        })() : '';

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage bans')
            .setDescription(`> Active ban: \`${target.isBanned() ? '✅' : '❌'}\`${banInfo}`);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Ban')
                        .setCustomId('ban')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel('Unban')
                        .setCustomId('unban')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setLabel('Ban history')
                        .setCustomId('banHistory')
                        .setStyle(ButtonStyle.Secondary)
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}