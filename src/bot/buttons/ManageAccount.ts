import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManageAccount extends Button {
    constructor() {
        super('manageAccount');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageBans) && !staff.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Manage account')
        .setDescription('Here you can ban/unban the player and manage their watchlist status')
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Ban')
                .setCustomId('ban')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!staff.hasPermission(Permission.ManageBans)),
                new ButtonBuilder()
                .setLabel('Unban')
                .setCustomId('unban')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!staff.hasPermission(Permission.ManageBans))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Watch')
                .setCustomId('watch')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!staff.hasPermission(Permission.ManageWatchlist)),
                new ButtonBuilder()
                .setLabel('Unwatch')
                .setCustomId('unwatch')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!staff.hasPermission(Permission.ManageWatchlist))
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}