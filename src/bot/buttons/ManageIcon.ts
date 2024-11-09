import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "../structs/Button";
import players, { GlobalIcon, Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { constantCase } from "change-case";
import { getCustomIconUrl } from "../../routes/icon";

export default class ManageIcon extends Button {
    constructor() {
        super('manageIcon');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.tag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have a tag!`)], ephemeral: true });

        const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Manage icon`)
        .setDescription(`Here you can edit the player's icon type and texture.`)
        .addFields(message.embeds[0].fields[0]);

        if(constantCase(player.icon.name) == constantCase(GlobalIcon[GlobalIcon.Custom]) && player.icon.hash) {
            embed.setThumbnail(getCustomIconUrl(player.uuid, player.icon.hash));
        }

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Change type`)
                .setCustomId(`setIconType`)
                .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                .setLabel(`Clear texture`)
                .setCustomId(`clearIconTexture`)
                .setStyle(ButtonStyle.Danger)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
}