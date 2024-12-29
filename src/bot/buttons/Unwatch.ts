import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { Permission } from "../../types/Permission";

export default class Unwatch extends Button {
    constructor() {
        super("unwatch");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageWatchlist)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.watchlist) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player is not on the watchlist!`)], ephemeral: true });

        player.watchlist = false;
        player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.Unwatch,
            uuid: player.uuid,
            staff: staff.uuid,
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The player is not being watched anymore!`)], ephemeral: true });
    }
}