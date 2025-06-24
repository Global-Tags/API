import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/Role";

export default class AddRoleButton extends Button {
    constructor() {
        super({
            id: 'addRole_',
            requiredPermissions: [Permission.ManagePlayerRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const options = getCachedRoles().filter((role) => !target.getActiveRoles().some((r) => r.role.name == role.name)).slice(0, 25).map(({ name: role }) => {
            role = snakeCase(role);
            return {
                label: capitalCase(role),
                value: role
            }
        });

        if(options.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ No roles to add!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents([
                new StringSelectMenuBuilder()
                    .setCustomId(`addRole_${target.uuid}`)
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder('Select a role to add...')
                    .setOptions(options)
            ]);

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]).setTitle('Add role').setDescription('Please select a role to add!')], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}