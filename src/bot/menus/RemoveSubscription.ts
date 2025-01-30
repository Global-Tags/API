import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, DiscordAPIError, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { client, colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class RemoveSubscription extends SelectMenu {
    constructor() {
        super('removeSubscription');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageSubscriptions)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!player.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have their account linked!')], flags: [MessageFlags.Ephemeral] });

        try {
            await client.application!.entitlements.deleteTest(values[0]);
    
            interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The subscription was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
        } catch(err: any) {
            interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Entitlement could not be deleted: ${(err as DiscordAPIError)?.message || 'Unknown error'}`)], flags: [MessageFlags.Ephemeral] });
        }
    }
}