import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { formatTimestamp } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class EditRole extends SelectMenu {
    constructor() {
        super({
            id: 'editRole',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = target.getActiveRoles().find(role => role.role.name == values[0]);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Edit role properties')
            .setDescription(`>>> **Note**: \`${role.reason || '-'}\`\n**Expiration**: ${role.expiresAt ? `${formatTimestamp(role.expiresAt)} (${formatTimestamp(role.expiresAt, 'R')})` : '`-`'}`)
            .setFooter({ text: values[0] });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('editRoleNote')
                    .setLabel('Edit note')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('editRoleExpiration')
                    .setLabel('Edit expiration')
                    .setStyle(ButtonStyle.Primary)
            );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}