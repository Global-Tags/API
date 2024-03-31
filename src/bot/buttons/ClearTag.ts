import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";

export default class ClearTag extends Button {
    constructor() {
        super("clearTag");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.tag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have a tag!`)], ephemeral: true });

        player.tag = undefined;
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The tag was successfully deleted!`)], ephemeral: true });
    }
}