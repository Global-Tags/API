import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { snakeCase } from "change-case";
import { getCustomIconUrl } from "../../routes/players/[uuid]/icon";
import { Permission } from "../../types/Permission";
import { GlobalIcon } from "../../types/GlobalIcon";

export default class ManageIcon extends Button {
    constructor() {
        super('manageIcon');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });
        
        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Manage icon')
            .setDescription('Here you can edit the player\'s icon type and texture.')
            .addFields(message.embeds[0].fields[0]);

        if(snakeCase(player.icon.name) == snakeCase(GlobalIcon[GlobalIcon.Custom]) && player.icon.hash) {
            embed.setThumbnail(getCustomIconUrl(player.uuid, player.icon.hash));
        }

        const rows = [
            new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Change type')
                    .setCustomId('setIconType')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('Clear texture')
                    .setCustomId('clearIconTexture')
                    .setStyle(ButtonStyle.Danger)
            )
        ]

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}