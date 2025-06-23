import { ButtonInteraction, Message, GuildMember, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { GlobalPosition, positions } from "../../types/GlobalPosition";

export default class SetPositionButton extends Button {
    constructor() {
        super({
            id: 'setPosition_',
            requiredPermissions: [Permission.ManagePlayerPositions]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Set position')
            .setDescription(`The player's current position is \`${capitalCase(target.position)}\`.`);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`setPosition_${target.uuid}`)
            .setPlaceholder('Please select a position.')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(positions.map((position) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(capitalCase(position))
                    .setDefault(position == target.position)
                    .setValue(position)
            ));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }
}