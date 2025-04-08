import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageConnectionsButton extends Button {
    constructor() {
        super({
            id: 'manageConnections',
            requiredPermissions: [Permission.ManageConnections]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const uuid = message.embeds[0].author!.name;
        const target = await players.findOne({ uuid: stripUUID(uuid) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage connections')
            .setDescription('Here you can manage the player\'s connections.');

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Unlink Discord')
                    .setCustomId('unlinkDiscord')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!target.connections.discord.id),
                new ButtonBuilder()
                    .setLabel('Reset linking code')
                    .setCustomId('resetDiscordLinkingCode')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!target.connections.discord.code)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Unlink Email')
                    .setCustomId('unlinkEmail')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!target.connections.email.address),
                new ButtonBuilder()
                    .setLabel('Reset linking code')
                    .setCustomId('resetEmailLinkingCode')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!target.connections.email.code)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}