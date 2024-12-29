import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { constantCase, pascalCase } from "change-case";
import GlobalIcon from "../../types/GlobalIcon";
import { Permission } from "../../types/Permission";

const icons = Object.keys(GlobalIcon)
    .filter((icon) => isNaN(Number(icon)))
    .map((icon) => constantCase(icon));

export default class SetIconType extends Button {
    constructor() {
        super('setIconType')
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(colors.standart)
        .setTitle(`Set icon type`)
        .setDescription(`The player's current icon type is \`${pascalCase(player.icon.name)}\`.`)
        .addFields(message.embeds[0].fields[0]);

        const menu = new StringSelectMenuBuilder()
        .setCustomId('setIconType')
        .setPlaceholder('Please select a role.')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(icons.map((icon) => {
            return new StringSelectMenuOptionBuilder()
            .setLabel(pascalCase(icon))
            .setDefault(constantCase(player.icon.name) == icon)
            .setValue(icon)
        }).slice(0, 25));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], ephemeral: true });
    }
}