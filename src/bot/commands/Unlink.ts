import { CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, MessageFlags, User } from "discord.js";
import Command from "../structs/Command";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { GameProfile } from "../../libs/game-profiles";
import { onDiscordUnlink } from "../../libs/events";

export default class Unlink extends Command {
    constructor() {
        super({
            name: 'unlink',
            description: 'Unlink your Discord account from your Minecraft account.',
            allowWhenBanned: true,
            requireDiscordLink: true
        });
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        await onDiscordUnlink(await GameProfile.getProfileByUUID(player.uuid), player.connections.discord.id!);

        player.connections.discord.id = null;
        player.connections.discord.code = null;
        player.save();

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Your account was successfully unlinked!')] });
    }
}