import { ButtonInteraction, Message, GuildMember, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { GlobalIcon, icons } from "../../types/GlobalIcon";

export default class SetIconTypeButton extends Button {
    constructor() {
        super({
            id: 'setIconType_',
            requiredPermissions: [Permission.ManagePlayerIcons]
        })
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Set icon type')
            .setDescription(`The player's current icon type is \`${capitalCase(target.icon.name)}\`.`);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`setIconType_${target.uuid}`)
            .setPlaceholder('Please select an icon.')
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(icons.map((icon) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(icon)
                    .setDefault(icon == target.icon.name)
                    .setValue(icon)
            ).slice(0, 25));

        interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }
}