import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class DeleteApiKeyButton extends Button {
    constructor() {
        super({
            id: 'deleteApiKey_',
            requiredPermissions: [Permission.DeleteApiKeys]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
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
            .setTitle('Delete API key')
            .setDescription('Here you can delete the player\'s API keys.');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId(`deleteApiKey_${target.uuid}`)
                .setPlaceholder('Select an API key to delete...')
                .setMinValues(0)
                .setMaxValues(1)
                .setOptions(options)
            );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}