import { ButtonInteraction, Message, GuildMember, EmbedBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Player } from "../../database/schemas/players";
import { GameProfile } from "../../libs/game-profiles";
import { Permission } from "../../types/Permission";

export default class BanHistoryButton extends Button {
    constructor() {
        super({
            id: 'banHistory_',
            requiredPermissions: [Permission.ViewBans]
        });
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')] });

        const bans = [];

        for(const ban of target.bans.reverse()) {
            bans.push({
                label: `${ban.reason} (#${ban.id})`,
                description: `banned by ${(await GameProfile.getProfileByUUID(ban.staff)).getUsernameOrUUID()} on ${ban.banned_at.toDateString()}`,
                value: ban.id,
                emoji: ban.expires_at && Date.now() > ban.expires_at.getTime() ? '🔓' : '🔒'
            });
        }

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Ban history')
            .setDescription('Here you can see all bans of the player.');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`banHistory_${target.uuid}`)
                    .setPlaceholder('Please select a ban to see')
                    .setMinValues(0)
                    .setMaxValues(1)
                    .setOptions(bans)
            );
        
        interaction.editReply({ embeds: [embed], components: [row] });
    }
}