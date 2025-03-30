import { CommandInteractionOptionResolver, EmbedBuilder, GuildMember, Interaction, MessageFlags } from "discord.js";
import Event from "../structs/Event";
import * as bot from "../bot";
import { captureException } from "@sentry/bun";
import players from "../../database/schemas/players";
import { config } from "../../libs/config";

const errorEmbed = new EmbedBuilder()
    .setColor(bot.colors.error)
    .setDescription('❌ An error ocurred! Our team has been notified.');

export default class InteractionCreate extends Event {
    constructor() {
        super('interactionCreate', false);
    }

    async fire(interaction: Interaction) {
        const player = await players.findOne({ 'connections.discord.id': interaction.user.id });

        if(interaction.isChatInputCommand()) {
            const { member, commandName, options } = interaction;
            const command = bot.commands.get(commandName);

            if(!command) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown command!')], flags: [MessageFlags.Ephemeral] });
            if(command.requireDiscordLink) {
                if(!config.discordBot.notifications.accountConnections.enabled) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Account linking is deactivated!')] });
                if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
                if(command.requiredPermissions.some(perm => !player.hasPermission(perm))) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
            }
            if(player?.isBanned() && !command.allowWhenBanned) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ You are banned!')], flags: [MessageFlags.Ephemeral] });

            try {
                command.execute(interaction, options as CommandInteractionOptionResolver, member as GuildMember, player);
            } catch(err: any) {
                captureException(err);
                interaction.replied ? interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
            }
        } else if(interaction.isButton()) {
            const { member, user, customId, message } = interaction;
            const button = bot.buttons.get(customId);

            if(!button) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown button!')], flags: [MessageFlags.Ephemeral] });

            try {
                button.trigger(interaction, message, member as GuildMember, user);
            } catch(err: any) {
                captureException(err);
                interaction.replied ? interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
            }
        } else if(interaction.isStringSelectMenu()) {
            const { member, user, customId, values, message } = interaction;
            const menu = bot.menus.get(customId);

            if(!menu) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown menu!')], flags: [MessageFlags.Ephemeral] });

            try {
                menu.selection(interaction, message!, values, member as GuildMember, user);
            } catch(err: any) {
                captureException(err);
                interaction.replied ? interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
            }
        } else if(interaction.isModalSubmit()) {
            const { member, user, customId, fields, message } = interaction;
            const modal = bot.modals.find((modal) => customId.startsWith(modal.id));

            if(!modal) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown modal!')], flags: [MessageFlags.Ephemeral] });

            try {
                modal.submit(interaction, message!, fields, member as GuildMember, user);
            } catch(err: any) {
                captureException(err);
                interaction.replied ? interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
}