import { CommandInteractionOptionResolver, EmbedBuilder, GuildMember, Interaction, MessageFlags } from "discord.js";
import Event from "../structs/Event";
import * as bot from "../bot";
import { captureException } from "@sentry/bun";

const errorEmbed = new EmbedBuilder()
    .setColor(bot.colors.error)
    .setDescription('❌ An error ocurred! Our team has been notified.');

export default class InteractionCreate extends Event {
    constructor() {
        super('interactionCreate', false);
    }

    async fire(interaction: Interaction) {
        if(interaction.isChatInputCommand()) {
            const { member, user, commandName, options } = interaction;
            const command = bot.commands.get(commandName);

            if(!command) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown command!')], flags: [MessageFlags.Ephemeral] });

            try {
                command.execute(interaction, options as CommandInteractionOptionResolver, member as GuildMember, user);
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