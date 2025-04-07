import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import { client, colors, images } from "../bot";
import { getCachedRoles } from "../../database/schemas/roles";
import players from "../../database/schemas/players";
import { Permission } from "../../types/Permission";

export default class SetSkuButton extends Button {
    constructor() {
        super('setSku');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const skus = (await client.application!.fetchSKUs()).map((sku) => ({ id: sku.id, name: sku.name }));
        if(skus.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ No SKUs found!')], flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
        .setColor(colors.gray)
        .setTitle(`Select an SKU for \`${role.name}\``)
        .setImage(images.placeholder)
        .setFooter({ text: role.name });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('setSku')
                    .setPlaceholder('Please select an SKU...')
                    .setMinValues(0)
                    .setMaxValues(1)
                    .setOptions(skus.slice(0, 25).map((sku) => ({
                        label: sku.name,
                        value: sku.id,
                        emoji: '💳',
                        default: role.sku == sku.id
                    })))
            );
        
        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}