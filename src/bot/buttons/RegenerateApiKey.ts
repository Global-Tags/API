import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class RegenerateApiKey extends Button {
    constructor() {
        super({
            id: 'regenerateApiKey',
            requiredPermissions: [Permission.ManageApiKeys]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const options = target.api_keys.map((key) => 
            new StringSelectMenuOptionBuilder()
                .setLabel(key.name)
                .setValue(key.name)
                .setEmoji('🔑')
                .setDescription(`Created on ${key.created_at.toDateString()}. ${key.last_used ? `Last used on ${key.last_used.toDateString()}` : 'Never used'}.`)
        );

        if(options.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player doesn\'t have any API keys!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Regenerate API key')
            .setDescription('Here you can regenerate the player\'s API keys.');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('regenerateApiKey')
                .setPlaceholder('Select an API key to regenerate...')
                .setMinValues(0)
                .setMaxValues(1)
                .setOptions(options)
            );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}