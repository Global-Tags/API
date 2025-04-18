import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageWatchlistButton extends Button {
    constructor() {
        super({
            id: 'manageWatchlist',
            requiredPermissions: [Permission.ManageWatchlist]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Moderate account')
            .setDescription(`> Watchlist: \`${target.watchlist ? '✅' : '❌'}\``);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Watch')
                        .setCustomId('watch')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel('Unwatch')
                        .setCustomId('unwatch')
                        .setStyle(ButtonStyle.Success)
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}