import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageConnectionsButton extends Button {
    constructor() {
        super({
            id: 'manageConnections_',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage connections')
            .setDescription('Here you can manage the player\'s connections.');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Overwrite value')
                    .setCustomId(`overwriteDiscord_${interaction.customId.split('_')[1]}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('Reset linking code')
                    .setCustomId(`resetDiscordLinkingCode_${interaction.customId.split('_')[1]}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!target.connections.discord.code),
                new ButtonBuilder()
                    .setLabel('Unlink Discord')
                    .setCustomId(`unlinkDiscord_${interaction.customId.split('_')[1]}`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!target.connections.discord.id)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Overwrite value')
                    .setCustomId(`overwriteEmail_${interaction.customId.split('_')[1]}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('Reset linking code')
                    .setCustomId(`resetEmailLinkingCode_${interaction.customId.split('_')[1]}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!target.connections.email.code),
                new ButtonBuilder()
                    .setLabel('Unlink Email')
                    .setCustomId(`unlinkEmail_${interaction.customId.split('_')[1]}`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!target.connections.email.address)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}