import { CommandInteractionOptionResolver, EmbedBuilder, GuildMember, Interaction, MessageFlags } from "discord.js";
import Event from "../structs/Event";
import * as bot from "../bot";

export default class InteractionCreate extends Event {
    constructor() {
        super('interactionCreate', false);
    }

    async fire(interaction: Interaction) {
        if(interaction.isChatInputCommand()) {
            const { member, user, commandName, options } = interaction;
            const cmd = bot.commands.get(commandName);

            if(!cmd) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown command!')], flags: [MessageFlags.Ephemeral] });

            try {
                cmd.execute(interaction, options as CommandInteractionOptionResolver, member as GuildMember, user);
            } catch(err: any) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle('❌ An error ocurred!').setDescription(err)], flags: [MessageFlags.Ephemeral] });
            }
        } else if(interaction.isButton()) {
            const { member, user, customId, message } = interaction;
            const btn = bot.buttons.get(customId);

            if(!btn) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown button!')], flags: [MessageFlags.Ephemeral] });

            try {
                btn.trigger(interaction, message, member as GuildMember, user);
            } catch(err: any) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle('❌ An error ocurred!').setDescription(err)], flags: [MessageFlags.Ephemeral] });
            }
        } else if(interaction.isStringSelectMenu()) {
            const { member, user, customId, values, message } = interaction;
            const menu = bot.menus.get(customId);

            if(!menu) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown menu!')], flags: [MessageFlags.Ephemeral] });

            try {
                menu.selection(interaction, message!, values, member as GuildMember, user);
            } catch(err: any) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle('❌ An error ocurred!').setDescription(err)], flags: [MessageFlags.Ephemeral] });
            }
        } else if(interaction.isModalSubmit()) {
            const { member, user, customId, fields, message } = interaction;
            const modal = bot.modals.find((modal) => customId.startsWith(modal.id));

            if(!modal) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setDescription('❌ Unknown modal!')], flags: [MessageFlags.Ephemeral] });

            try {
                modal.submit(interaction, message!, fields, member as GuildMember, user);
            } catch(err: any) {
                if(!interaction.replied) return interaction.reply({ embeds: [new EmbedBuilder().setColor(bot.colors.error).setTitle('❌ An error ocurred!').setDescription(err)], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
}