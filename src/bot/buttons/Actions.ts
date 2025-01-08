import { ButtonInteraction, CacheType, Message, GuildMember, User, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { uuidRegex } from "../commands/PlayerInfo";
import { config } from "../../libs/config";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class Actions extends Button {
    constructor() {
        super("actions");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.canManagePlayersSync()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        const uuid = message.embeds[0].fields[0].value.replaceAll(`\``, ``);
        if(!uuid) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        const strippedUUID = stripUUID(uuid);
        const player = await players.findOne({ uuid: strippedUUID });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setThumbnail(`https://laby.net/texture/profile/head/${strippedUUID}.png?size=1024&overlay`)
            .setTitle(`Action menu`)
            .addFields({
                name: `Target UUID`,
                value: `\`\`\`${strippedUUID}\`\`\``
            });

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(`Manage account`)
                    .setCustomId(`manageAccount`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!staff.hasPermissionSync(Permission.ManageBans) && !staff.hasPermissionSync(Permission.ManageWatchlist)),
                new ButtonBuilder()
                    .setLabel(`Manage tag`)
                    .setCustomId(`manageTag`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!staff.hasPermissionSync(Permission.ManageTags))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(`Reports${player.reports.length > 0 ? ` (${player.reports.length})` : ''}`)
                    .setCustomId(`reports`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!staff.hasPermissionSync(Permission.ManageReports)),
                new ButtonBuilder()
                    .setLabel(`Notes${player.notes.length > 0 ? ` (${player.notes.length})` : ''}`)
                    .setCustomId(`notes`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!staff.hasPermissionSync(Permission.ManageNotes))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                config.discordBot.syncedRoles.enabled
                    ? new ButtonBuilder().setLabel(`Manage subscriptions`).setCustomId(`manageSubscriptions`).setStyle(ButtonStyle.Primary).setDisabled(!staff.hasPermissionSync(Permission.ManageSubscriptions))
                    : new ButtonBuilder().setLabel(`Edit roles`).setCustomId(`editRoles`).setStyle(ButtonStyle.Primary).setDisabled(!staff.hasPermissionSync(Permission.ManageRoles)),
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}