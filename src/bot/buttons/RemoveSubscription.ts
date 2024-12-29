import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { client, colors } from "../bot";
import { getSkus } from "../../libs/SkuManager";
import { Permission } from "../../types/Permission";

const skus = getSkus();

export default class RemoveSubscription extends Button {
    constructor() {
        super('removeSubscription');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageSubscriptions) && !staff.hasPermission(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have their account linked!`)], ephemeral: true });

        const entitlements = (await client.application!.entitlements.fetch({ user: player.connections.discord.id })).filter(e => !e.startsTimestamp && e.isActive() && skus.some(sku => sku.id == e.skuId));
        if(entitlements.size == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The player currently has no removable subscriptions.`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Remove subscription')
        .setDescription(`Here you can remove a subscription gift from the player.`)
        .addFields(message.embeds[0].fields[0])
        .setThumbnail(message.embeds[0].thumbnail!.url);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
            .setCustomId('removeSubscription')
            .setPlaceholder('Select a subscription...')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(entitlements.map(entitlement => 
                new StringSelectMenuOptionBuilder()
                .setLabel(skus.find(sku => sku.id == entitlement.skuId)?.name || 'Unknown SKU')
                .setValue(entitlement.id)
                .setEmoji('✨')
            ))
        );

        interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}