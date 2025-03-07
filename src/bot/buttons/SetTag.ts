import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { stripUUID } from "../../libs/game-profiles";

export default class SetTag extends Button {
    constructor() {
        super('setTag');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const input = new TextInputBuilder()
            .setLabel('New tag')
            .setCustomId('tag')
            .setPlaceholder('Enter a tag')
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        if(player.tag) input.setValue(player.tag);

        const modal = new ModalBuilder()
            .setTitle('Set new tag')
            .setCustomId('setTag')
            .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

        interaction.showModal(modal);
    }
}