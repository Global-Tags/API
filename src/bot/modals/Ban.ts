import { ModalSubmitInteraction, CacheType, Message, ModalSubmitFields, GuildMember, User, EmbedBuilder } from "discord.js";
import Modal from "../structs/Modal";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class Ban extends Modal {
    constructor() {
        super("ban");
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(player.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player is already banned!`)], ephemeral: true });
        const reason = fields.getTextInputValue(`reason`);

        player.banPlayer(reason);
        player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.Ban,
            uuid: player.uuid,
            staff: user.id,
            reason: reason,
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The player was successfully banned!`)], ephemeral: true });
    }
}