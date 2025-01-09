import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, constantCase, pascalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { GlobalPosition, positions } from "../../types/GlobalPosition";

export default class SetPosition extends Button {
    constructor() {
        super('setPosition')
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Set position`)
        .setDescription(`The player's current position is \`${pascalCase(player.position)}\`.`)
        .addFields(message.embeds[0].fields[0]);

        const menu = new StringSelectMenuBuilder()
        .setCustomId('setPosition')
        .setPlaceholder('Please select a role.')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(positions.map((position) =>
            new StringSelectMenuOptionBuilder()
                .setLabel(capitalCase(GlobalPosition[position]))
                .setDefault(snakeCase(GlobalPosition[position]) == snakeCase(player.position))
                .setValue(GlobalPosition[position])
        ));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], ephemeral: true });
    }
}