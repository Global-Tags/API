import { ButtonInteraction, CacheType, Message, GuildMember, User, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import { colors } from "../bot";
import players from "../../database/schemas/players";
import { uuidRegex } from "../commands/PlayerInfo";

export default class Actions extends Button {
    constructor() {
        super("actions");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.admin) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        const uuid = message.embeds[0].fields[0].value.replaceAll(`\``, ``).match(uuidRegex)?.[1];
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
                .setLabel(`Make Admin`)
                .setCustomId(`makeAdmin`)
                .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                .setLabel(`Remove Admin`)
                .setCustomId(`removeAdmin`)
                .setStyle(ButtonStyle.Danger)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Unwatch`)
                .setCustomId(`unwatch`)
                .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                .setLabel(`Watch`)
                .setCustomId(`watch`)
                .setStyle(ButtonStyle.Danger)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Unban`)
                .setCustomId(`unban`)
                .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                .setLabel(`Ban`)
                .setCustomId(`ban`)
                .setStyle(ButtonStyle.Danger)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Set tag`)
                .setCustomId(`setTag`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Clear tag`)
                .setCustomId(`clearTag`)
                .setStyle(ButtonStyle.Danger)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}