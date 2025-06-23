import { CommandInteraction, EmbedBuilder, GuildMember, MessageFlags, User } from "discord.js";
import Command, { CommandOptions } from "../structs/Command";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { onDiscordUnlink } from "../../libs/events";

export default class UnlinkCommand extends Command {
    constructor() {
        super({
            name: 'unlink',
            description: 'Unlink your Discord account from your Minecraft account.',
            allowWhenBanned: true,
            requireDiscordLink: true
        });
    }

    async execute(interaction: CommandInteraction, options: CommandOptions, member: GuildMember, player: PlayerDocument) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        await onDiscordUnlink(await player.getGameProfile(), player.connections.discord.id!);

        player.connections.discord.id = null;
        player.connections.discord.code = null;
        player.save();

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Your account was successfully unlinked!')] });
    }
}