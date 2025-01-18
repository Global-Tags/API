import { ApplicationCommandOptionType, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { sendDiscordLinkMessage } from "../../libs/discord-notifier";
import { config } from "../../libs/config";
import { getProfileByUUID } from "../../libs/game-profiles";
import { onDiscordLink } from "../../libs/events";

export default class Link extends Command {
    constructor() {
        super(
            "link",
            "Link your Discord account to your Minecraft account.",
            [
                {
                    name: 'code',
                    description: 'The code you got from executing \'/gt link discord\' in minecraft.',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        );
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        if(!config.discordBot.notifications.accountConnections.enabled) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Account linking is deactivated!')] });
        const code = options.getString('code', true);

        const self = await players.findOne({ 'connections.discord.id': user.id });
        if(self) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Your Discord account is already linked to a Minecraft account! Please use `/unlink` to remove the connection.')] });

        const player = await players.findOne({ "connections.discord.code": code });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid code')] });

        player.connections.discord.id = user.id;
        player.connections.discord.code = null;
        player.save();

        onDiscordLink(await getProfileByUUID(player.uuid), user.id);

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Your account was successfully linked!')] });
    }
}