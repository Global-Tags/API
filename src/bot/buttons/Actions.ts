import { ButtonInteraction, CacheType, Message, GuildMember, User, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import * as config from "../../../config.json";
import { colors } from "../bot";

export default class Actions extends Button {
    constructor() {
        super("actions");
    }

    public trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        if(!config.bot.staff.includes(user.id)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You don't have permissions!`)], ephemeral: true });
        const uuid = message.embeds[0].fields[0].value.replaceAll(`\``, ``);

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
                .setLabel(`Watch`)
                .setCustomId(`watch`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Unwatch`)
                .setCustomId(`unwatch`)
                .setStyle(ButtonStyle.Primary)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Ban`)
                .setCustomId(`ban`)
                .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                .setLabel(`Unban`)
                .setCustomId(`unban`)
                .setStyle(ButtonStyle.Success)
            ),
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Clear tag`)
                .setCustomId(`clearTag`)
                .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                .setLabel(`Set tag`)
                .setCustomId(`setTag`)
                .setStyle(ButtonStyle.Primary)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}