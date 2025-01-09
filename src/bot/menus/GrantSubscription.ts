import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, DiscordAPIError } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { client, colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class GrantSubscription extends SelectMenu {
    constructor() {
        super('grantSubscription');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageSubscriptions)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.connections.discord.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have their account linked!`)], ephemeral: true });

        try {
            await client.application!.entitlements.createTest({ sku: values[0], user: player.connections.discord.id });
    
            interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The subscription was successfully granted!`)], ephemeral: true });
        } catch(err: any) {
            interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Entitlement could not be created: ${(err as DiscordAPIError)?.message || 'Unknown error'}`)], ephemeral: true });
        }
    }
}