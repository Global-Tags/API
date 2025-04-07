import { ButtonInteraction, Message, GuildMember, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { GlobalPosition, positions } from "../../types/GlobalPosition";
import { stripUUID } from "../../libs/game-profiles";

export default class SetPositionButton extends Button {
    constructor() {
        super({
            id: 'setPosition',
            requiredPermissions: [Permission.ManageTags]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Set position')
            .setDescription(`The player's current position is \`${capitalCase(target.position)}\`.`);

        const playerPosition = snakeCase(target.position);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('setPosition')
            .setPlaceholder('Please select a position.')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(positions.map((position) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(capitalCase(GlobalPosition[position]))
                    .setDefault(snakeCase(GlobalPosition[position]) == playerPosition)
                    .setValue(GlobalPosition[position])
            ));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }
}