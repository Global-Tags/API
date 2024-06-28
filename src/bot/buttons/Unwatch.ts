import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class Unwatch extends Button {
    constructor() {
        super("unwatch");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.watchlist) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player is not on the watchlist!`)], ephemeral: true });

        player.watchlist = false;
        player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.Unwatch,
            uuid: player.uuid,
            staff: user.id,
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The player is not being watched anymore!`)], ephemeral: true });
    }
}