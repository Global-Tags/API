import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { snakeCase } from "change-case";
import { getCustomIconUrl } from "../../routes/players/[uuid]/icon";
import { Permission } from "../../types/Permission";
import { GlobalIcon } from "../../types/GlobalIcon";
import { config } from "../../libs/config";
import { stripUUID } from "../../libs/game-profiles";

export default class ManageIcon extends Button {
    constructor() {
        super({
            id: 'manageIcon',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('Manage icon')
            .setDescription('Here you can edit the player\'s icon type and texture.');

        const icon = snakeCase(target.icon.name);
        if(icon != snakeCase(GlobalIcon[GlobalIcon.None])) {
            if(icon == snakeCase(GlobalIcon[GlobalIcon.Custom])) {
                if(!!target.icon.hash) {
                    embed.setThumbnail(getCustomIconUrl(target.uuid, target.icon.hash));
                }
            } else {
                embed.setThumbnail(config.iconUrl(target.icon.name));
            }
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
        ];

        interaction.reply({ embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] });
    }
}