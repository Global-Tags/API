import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendIconTypeChangeEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";

export default class SetIconTypeMenu extends SelectMenu {
    constructor() {
        super({
            id: 'setIconType_',
            requiredPermissions: [Permission.ManagePlayerIcons],
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(target.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player is already banned!')], flags: [MessageFlags.Ephemeral] });

        const oldIcon = { ...target.icon };
        target.icon.name = values[0];
        await target.save();

        sendModLogMessage({
            logType: ModLogType.ChangeIconType,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            icons: {
                old: oldIcon.name,
                new: target.icon.name
            }
        });

        if(target.isEmailVerified()) {
            sendIconTypeChangeEmail(target.connections.email.address!, oldIcon.name, target.icon.name, getI18nFunctionByLanguage(target.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The players icon type was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}