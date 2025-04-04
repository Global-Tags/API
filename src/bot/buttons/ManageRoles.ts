import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, MessageFlags, ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageRoles extends Button {
    constructor() {
        super({
            id: 'manageRoles',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents([
                new ButtonBuilder()
                    .setLabel('Add role')
                    .setCustomId('addRole')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Edit role')
                    .setCustomId('editRole')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('Remove role')
                    .setCustomId('removeRole')
                    .setStyle(ButtonStyle.Danger)
            ]);

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]).setTitle('Edit roles').setDescription('Here you can manage the player\'s roles and their properties')], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}