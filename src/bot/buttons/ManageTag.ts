import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageTag extends Button {
    constructor() {
        super({
            id: 'manageTag',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage tag')
            .setDescription('Here you can edit the player\'s tag, position and icon.');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Change tag')
                        .setCustomId('setTag')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setLabel('Clear tag')
                        .setCustomId('clearTag')
                        .setStyle(ButtonStyle.Danger)
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Set position')
                        .setCustomId('setPosition')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setLabel('Manage icon')
                        .setCustomId('manageIcon')
                        .setStyle(ButtonStyle.Primary)
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}