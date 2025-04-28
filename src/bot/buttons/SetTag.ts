import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class SetTagButton extends Button {
    constructor() {
        super({
            id: 'setTag_',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const input = new TextInputBuilder()
            .setLabel('New tag')
            .setCustomId('tag')
            .setPlaceholder('Enter a tag')
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        if(target.tag) input.setValue(target.tag);

        const modal = new ModalBuilder()
            .setTitle('Set new tag')
            .setCustomId(`setTag_${target.uuid}`)
            .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

        interaction.showModal(modal);
    }
}