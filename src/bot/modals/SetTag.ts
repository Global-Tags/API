import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";

export default class SetTag extends Modal {
    constructor() {
        super("setTag");
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        player.tag = fields.getTextInputValue('tag');
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The tag was successfully set!`)], ephemeral: true });
    }
}