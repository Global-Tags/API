import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from "discord.js";
import Button from "../structs/Button";
import players, { GlobalPosition, Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { constantCase, pascalCase } from "change-case";

const positions = Object.keys(GlobalPosition)
    .filter((pos) => isNaN(Number(pos)))
    .map((pos) => constantCase(pos));

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
        if(!player.tag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have a tag!`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Set position`)
        .setDescription(`The player's current position is \`${pascalCase(player.position)}\`.`)

        const menu = new StringSelectMenuBuilder()
        .setCustomId('setPosition')
        .setPlaceholder('Please select a role.')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(positions.map((position) => {
            return new StringSelectMenuOptionBuilder()
            .setLabel(pascalCase(position))
            .setDefault(player.position == position)
            .setValue(position)
        }));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] });
    }
}