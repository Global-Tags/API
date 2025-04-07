import { ApplicationCommandOptionType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, MessageFlags, User } from "discord.js";
import Command from "../structs/Command";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { config } from "../../libs/config";
import { onDiscordLink } from "../../libs/events";

export default class LinkCommand extends Command {
    constructor() {
        super({
            name: 'link',
            description: 'Link your Discord account to your Minecraft account.',
            options: [
                {
                    name: 'code',
                    description: 'The code you got from executing \'/gt link discord\' in minecraft.',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ],
            allowWhenBanned: true
        });
    }

    async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, player: Player | null) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        if(!config.discordBot.notifications.accountConnections.enabled) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Account linking is deactivated!')] });
        const code = options.getString('code', true);

        const self = await players.findOne({ 'connections.discord.id': member.user.id });
        if(self) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Your Discord account is already linked to a Minecraft account! Please use `/unlink` to remove the connection.')] });

        const codePlayer = await players.findOne({ "connections.discord.code": code });
        if(!codePlayer) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid code')] });

        codePlayer.connections.discord.id = member.user.id;
        codePlayer.connections.discord.code = null;
        codePlayer.save();

        onDiscordLink(await codePlayer.getGameProfile(), member.user.id);

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Your account was successfully linked!')] });
    }
}