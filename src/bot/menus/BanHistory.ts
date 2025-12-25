import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { formatTimestamp } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile } from "../../libs/game-profiles";

export default class BanHistoryMenu extends SelectMenu {
    constructor() {
        super({
            id: 'banHistory_',
            requiredPermissions: [Permission.ViewBans]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: PlayerDocument) {
        if(values.length == 0) return interaction.deferUpdate();

        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const ban = target.bans.find((note) => note.id == values[0]);
        if(!ban) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Ban not found!')], flags: [MessageFlags.Ephemeral] });

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]).setDescription(`\n> Ban ID: \`${ban.id}\`\n> Ban reason: \`${ban.reason}\`\n> Banned by: [\`${(await GameProfile.getProfileByUUID(ban.staff)).getUsernameOrUUID()}\`](https://laby.net/@${player.uuid})\n> Banned since: ${formatTimestamp(ban.banned_at)}\n> Expiration date: ${ban.expires_at ? `${formatTimestamp(ban.expires_at)}` : '`-`'}\n> Is ban appealable: \`${ban.appeal.appealable ? '✅' : '❌'}\`\n> Ban appeal: ${ban.appeal.appealed ? `\`${ban.appeal.reason || 'Unknown reason'}\` (${ban.appeal.appealed_at ? formatTimestamp(ban.appeal.appealed_at, 'd') : '`Unknown date`'})` : '--'}`)], flags: [MessageFlags.Ephemeral] });
    }
}