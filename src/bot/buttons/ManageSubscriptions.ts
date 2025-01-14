import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { client, colors } from "../bot";
import { getSkus } from "../../libs/sku-manager";
import { Permission } from "../../types/Permission";

const skus = getSkus();

export default class ManageSubscriptions extends Button {
    constructor() {
        super('manageSubscriptions');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageSubscriptions) && !staff.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], ephemeral: true });
        if(!player.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have their account linked!')], ephemeral: true });

        const entitlements = (await client.application!.entitlements.fetch({ user: player.connections.discord.id })).filter(e => e.isActive() && skus.some(sku => sku.id == e.skuId));

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Manage subscriptions')
        .setDescription(`Here you can grant the player a premium subscription for free or remove it.\n\n${entitlements.size > 0 ? `The player currently has the following subscriptions:\n${entitlements.map(e => `- **${skus.find(sku => sku.id == e.skuId)?.name || 'Unknown'}**${!e.startsTimestamp ? ' [**S**]' : ''}`).join('\n')}` : 'The player currently has no subscriptions.'}`)
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Grant subscription')
                .setCustomId('grantSubscription')
                .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                .setLabel('Remove subscription')
                .setCustomId('removeSubscription')
                .setStyle(ButtonStyle.Danger)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}