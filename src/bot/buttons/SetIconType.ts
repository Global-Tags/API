import { ButtonInteraction, Message, GuildMember, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { GlobalIcon, icons } from "../../types/GlobalIcon";
import { stripUUID } from "../../libs/game-profiles";

export default class SetIconType extends Button {
    constructor() {
        super({
            id: 'setIconType',
            requiredPermissions: [Permission.ManageTags]
        })
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Set icon type')
            .setDescription(`The player's current icon type is \`${capitalCase(target.icon.name)}\`.`);

        const playerIcon = snakeCase(target.icon.name);

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