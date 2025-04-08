import { CommandInteractionOptionResolver, EmbedBuilder, GuildMember, Interaction as DiscordInteraction, MessageFlags, RepliableInteraction, InteractionReplyOptions } from "discord.js";
import Event from "../structs/Event";
import * as bot from "../bot";
import { captureException } from "@sentry/bun";
import players, { Player } from "../../database/schemas/players";
import { config } from "../../libs/config";
import Interaction from "../structs/Interaction";

const errorEmbed = new EmbedBuilder()
    .setColor(bot.colors.error)
    .setDescription('❌ An error ocurred! Our team has been notified.');

export default class InteractionCreate extends Event {
    constructor() {
        super('interactionCreate', false);
    }

    async fire(interaction: DiscordInteraction) {
        const player = await players.findOne({ 'connections.discord.id': interaction.user.id });

        if(interaction.isChatInputCommand()) {
            const { member, commandName, options } = interaction;
            const command = bot.commands.get(commandName);

            if(!command) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown command!')], flags: [MessageFlags.Ephemeral] });
            const error = isInteractionAllowed(command, player);
            if(error) return interaction.reply(error);

            try {
                command.execute(interaction, options as CommandInteractionOptionResolver, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isButton()) {
            const { member, customId, message } = interaction;
            const button = bot.buttons.get(customId);

            if(!button) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown button!')], flags: [MessageFlags.Ephemeral] });
            const error = isInteractionAllowed(button, player);
            if(error) return interaction.reply(error);

            try {
                button.trigger(interaction, message, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isStringSelectMenu()) {
            const { member, customId, values, message } = interaction;
            const menu = bot.menus.get(customId);

            if(!menu) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown menu!')], flags: [MessageFlags.Ephemeral] });
            const error = isInteractionAllowed(menu, player);
            if(error) return interaction.reply(error);

            try {
                menu.selection(interaction, message!, values, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isModalSubmit()) {
            const { member, customId, fields, message } = interaction;
            const modal = bot.modals.find((modal) => customId.startsWith(modal.id));

            if(!modal) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown modal!')], flags: [MessageFlags.Ephemeral] });
            const error = isInteractionAllowed(modal, player);
            if(error) return interaction.reply(error);

            try {
                modal.submit(interaction, message!, fields, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        }
    }
}

function isInteractionAllowed(interaction: Interaction, player: Player | null): InteractionReplyOptions | null {
    if(interaction.requireDiscordLink) {
        if(!config.discordBot.notifications.accountConnections.enabled) return { embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Account linking is deactivated!')] };
        if(!player) return { embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] };
        if(interaction.requiredPermissions.some(perm => !player.hasPermission(perm))) return { embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] };
    }
    if(player?.isBanned() && !interaction.allowWhenBanned) return { embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ You are banned!')], flags: [MessageFlags.Ephemeral] };
    return null;
}

function catchError(interaction: RepliableInteraction, err: any) {
    captureException(err);
    interaction.replied ? interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
}