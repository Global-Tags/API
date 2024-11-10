import { ButtonInteraction, CacheType, Message, GuildMember, User, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players, { Permission } from "../../database/schemas/players";
import { uuidRegex } from "../commands/PlayerInfo";

export default class Actions extends Button {
    constructor() {
        super("actions");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasAnyElevatedPermissionSync()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        const uuid = message.embeds[0].fields[0].value.replaceAll(`\``, ``).match(uuidRegex)?.[0]?.replaceAll('-', '');
        if(!uuid) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setThumbnail(`https://laby.net/texture/profile/head/${uuid}.png?size=1024&overlay`)
        .setTitle(`Action menu`)
        .addFields({
            name: `Target UUID`,
            value: `\`\`\`${uuid}\`\`\``
        });

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Edit roles`)
                .setCustomId(`editRoles`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageRoles)),
                new ButtonBuilder()
                .setLabel(`Notes`)
                .setCustomId(`notes`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageNotes))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Unwatch`)
                .setCustomId(`unwatch`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageWatchlist)),
                new ButtonBuilder()
                .setLabel(`Watch`)
                .setCustomId(`watch`)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageWatchlist))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Unban`)
                .setCustomId(`unban`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageBans)),
                new ButtonBuilder()
                .setLabel(`Ban`)
                .setCustomId(`ban`)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageBans))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Set tag`)
                .setCustomId(`setTag`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageTags)),
                new ButtonBuilder()
                .setLabel(`Clear tag`)
                .setCustomId(`clearTag`)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageTags))
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Set position`)
                .setCustomId(`setPosition`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageTags)),
                new ButtonBuilder()
                .setLabel(`Manage icon`)
                .setCustomId(`manageIcon`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!staff.hasPermissionSync(Permission.ManageTags))
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}