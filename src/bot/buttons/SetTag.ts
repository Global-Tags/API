import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { validation } from "../../../config.json";
import { colors } from "../bot";

export default class SetTag extends Button {
    constructor() {
        super("setTag");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const input = new TextInputBuilder()
        .setLabel(`New tag`)
        .setCustomId(`tag`)
        .setPlaceholder(`Enter a tag`)
        .setRequired(true)
        .setMinLength(validation.tag.min)
        .setMaxLength(validation.tag.max)
        .setStyle(TextInputStyle.Short);

        if(player.tag) input.setValue(player.tag);

        const modal = new ModalBuilder()
        .setTitle(`Set new tag`)
        .setCustomId(`setTag`)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
            .addComponents(input)
        )

        interaction.showModal(modal);
    }
}