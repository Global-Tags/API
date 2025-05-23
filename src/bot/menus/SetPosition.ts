import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendPositionChangeEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";

export default class SetPositionMenu extends SelectMenu {
    constructor() {
        super({
            id: 'setPosition_',
            requiredPermissions: [Permission.ManageTags]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(target.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is already banned!')], flags: [MessageFlags.Ephemeral] });

        const oldPosition = target.position;
        target.position = values[0];
        await target.save();

        sendModLogMessage({
            logType: ModLogType.EditPosition,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            positions: {
                old: oldPosition,
                new: target.position
            }
        });

        if(target.isEmailVerified()) {
            sendPositionChangeEmail(target.connections.email.address!, oldPosition || '---', target.position, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The players position was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}