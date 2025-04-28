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

export default class InteractionCreateEvent extends Event {
    constructor() {
        super('interactionCreate', false);
    }

    async fire(interaction: DiscordInteraction) {
        const player = await players.findOne({ 'connections.discord.id': interaction.user.id });

        if(interaction.isChatInputCommand()) {
            const { member, commandName, options } = interaction;
            const command = bot.commands.get(commandName);

            if(!command) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown command!')], flags: [MessageFlags.Ephemeral] });
            const error = getInteractionError(command, player);
            if(error) return interaction.reply(getErrorReplyOptions(error));

            try {
                command.execute(interaction, options as CommandInteractionOptionResolver, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isButton()) {
            const { member, customId, message } = interaction;
            const button = bot.buttons.find((button) => customId.startsWith(button.id));

            if(!button) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown button!')], flags: [MessageFlags.Ephemeral] });
            const error = getInteractionError(button, player);
            if(error) return interaction.reply(getErrorReplyOptions(error));

            try {
                button.trigger(interaction, message, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isStringSelectMenu()) {
            const { member, customId, values, message } = interaction;
            const menu = bot.menus.find((menu) => customId.startsWith(menu.id));

            if(!menu) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown menu!')], flags: [MessageFlags.Ephemeral] });
            const error = getInteractionError(menu, player);
            if(error) return interaction.reply(getErrorReplyOptions(error));

            try {
                menu.selection(interaction, message!, values, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isModalSubmit()) {
            const { member, customId, fields, message } = interaction;
            const modal = bot.modals.find((modal) => customId.startsWith(modal.id));

            if(!modal) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown modal!')], flags: [MessageFlags.Ephemeral] });
            const error = getInteractionError(modal, player);
            if(error) return interaction.reply(getErrorReplyOptions(error));

            try {
                modal.submit(interaction, message!, fields, member as GuildMember, player);
            } catch(err: any) {
                catchError(interaction, err);
            }
        } else if(interaction.isAutocomplete()) {
            const { member, commandName, options } = interaction;
            const command = bot.commands.get(commandName);

            if(!command) return interaction.respond([{ name: '❌ Unknown command!', value: 'error' }]);
            const error = getInteractionError(command, player);
            if(error) return interaction.respond([{ name: error, value: 'error' }]);

            try {
                command.autocomplete(interaction, options, member as GuildMember, player);
            } catch(err: any) {
                captureException(err);
                interaction.respond([{ name: '❌ An error ocurred! Our team has been notified.', value: 'error' }]);
            }
        }
    }
}

function getErrorReplyOptions(error: string): InteractionReplyOptions {
    return { embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription(error)], flags: [MessageFlags.Ephemeral] };
}

function getInteractionError(interaction: Interaction, player: Player | null): string | null {
    if(interaction.requireDiscordLink) {
        if(!config.discordBot.notifications.accountConnections.enabled) return '❌ Account linking is deactivated!';
        if(!player) return '❌ You need to link your Minecraft account with `/link`!';
        if(interaction.requiredPermissions.some(perm => !player.hasPermission(perm))) return '❌ You\'re not allowed to perform this action!';
    }
    if(player?.isBanned() && !interaction.allowWhenBanned && process.env.NODE_ENV == 'prod') return '❌ You are banned!';
    return null;
}

function catchError(interaction: RepliableInteraction, err: any) {
    captureException(err);
    interaction.replied ? interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
}