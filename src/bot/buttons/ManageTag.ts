import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageTagButton extends Button {
    constructor() {
        super({
            id: 'manageTag_',
            requiredPermissions: [Permission.ManagePlayerTags]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage tag')
            .setDescription('Here you can edit the player\'s tag, position and icon.');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Change tag')
                        .setCustomId(`setTag_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setLabel('Clear tag')
                        .setCustomId(`clearTag_${target.uuid}`)
                        .setStyle(ButtonStyle.Danger)
                ),
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Set position')
                        .setCustomId(`setPosition_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setLabel('Manage icon')
                        .setCustomId(`manageIcon_${target.uuid}`)
                        .setStyle(ButtonStyle.Primary)
                )
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}