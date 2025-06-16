import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageWatchlistButton extends Button {
    constructor() {
        super({
            id: 'manageWatchlist_',
            requiredPermissions: [Permission.ManageWatchlistEntries]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Moderate account')
            .setDescription(`> Watchlist: \`${target.watchlist ? '✅' : '❌'}\``);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Watch')
                        .setCustomId(`watch_${target.uuid}`)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel('Unwatch')
                        .setCustomId(`unwatch_${target.uuid}`)
                        .setStyle(ButtonStyle.Success)
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}