import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageApiKeysButton extends Button {
    constructor() {
        super({
            id: 'manageApiKeys',
            requiredPermissions: [Permission.ManageApiKeys]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage API keys')
            .setDescription('Here you can manage the player\'s API keys.');

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Create Key')
                .setCustomId('createApiKey')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel('Regenerate Key')
                .setCustomId('regenerateApiKey')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setLabel('Delete Key')
                .setCustomId('deleteApiKey')
                .setStyle(ButtonStyle.Danger)
        );

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}