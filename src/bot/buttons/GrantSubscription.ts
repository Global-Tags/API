import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { getSkus } from "../../libs/sku-manager";
import { Permission } from "../../types/Permission";

const skus = getSkus();

export default class GrantSubscription extends Button {
    constructor() {
        super('grantSubscription');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageSubscriptions) && !staff.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], ephemeral: true });
        if(!player.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have their account linked!`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Add subscription')
        .setDescription(`Here you can gift a subscription to the player.`)
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
            .setCustomId('grantSubscription')
            .setPlaceholder('Select a SKU...')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(skus.map(sku => 
                new StringSelectMenuOptionBuilder()
                .setLabel(sku.name)
                .setValue(sku.id)
                .setEmoji('✨')
            ))
        );

        interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}