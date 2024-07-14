import { CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { bot } from "../../../config.json";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class PlayerInfo extends Command {
    constructor() {
        super(
            "unlink",
            "Unlink your Discord account from your Minecraft account.",
            []
        );
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        if(!bot.connection.active) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Account linking is deactivated!`)] });

        const player = await players.findOne({ "connections.discord.id": user.id });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Your Discord account is not linked to any Minecraft account!`)] });

        player.connections!.discord!.id = null;
        player.connections!.discord!.code = null;
        player.save();
        member.roles.remove(bot.connection.role);

        sendMessage({
            type: NotificationType.DiscordLink,
            connected: false,
            userId: user.id,
            uuid: player.uuid
        });

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Your account was successfully unlinked!`)] });
    }
}