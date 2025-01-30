import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { GlobalIcon, icons } from "../../types/GlobalIcon";

export default class SetIconType extends Button {
    constructor() {
        super('setIconType')
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
            .setColor(colors.standart)
            .setTitle('Set icon type')
            .setDescription(`The player's current icon type is \`${capitalCase(player.icon.name)}\`.`)
            .addFields(message.embeds[0].fields[0]);

        const playerIcon = snakeCase(player.icon.name);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('setIconType')
            .setPlaceholder('Please select an icon.')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(icons.map((icon) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(capitalCase(GlobalIcon[icon]))
                    .setDefault(snakeCase(GlobalIcon[icon]) == playerIcon)
                    .setValue(GlobalIcon[icon])
            ).slice(0, 25));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }
}