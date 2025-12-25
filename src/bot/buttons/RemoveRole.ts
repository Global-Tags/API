import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";

export default class RemoveRoleButton extends Button {
    constructor() {
        super({
            id: 'removeRole_',
            requiredPermissions: [Permission.ManagePlayerRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const options = target.getActiveRoles().slice(0, 25).map(({ role: { name: role } }) => {
            role = snakeCase(role);
            return {
                label: capitalCase(role),
                value: role
            }
        });

        if(options.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ No roles to remove!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents([
                new StringSelectMenuBuilder()
                    .setCustomId(`removeRole_${target.uuid}`)
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder('Select a role to remove...')
                    .setOptions(options)
            ]);

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]).setTitle('Remove role').setDescription('Please select a role to remove!')], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}