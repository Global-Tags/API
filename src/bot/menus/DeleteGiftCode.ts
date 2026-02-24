import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GiftCode } from "../../database/schemas/GiftCode";

export default class DeleteGiftCodeMenu extends SelectMenu {
    constructor() {
        super({
            id: 'deleteGiftCode',
            requiredPermissions: [Permission.DeleteGiftCodes]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: PlayerDocument) {
        if(values.length == 0) return interaction.deferUpdate();

        const code = await GiftCode.findOne({ code: values[0] });
        if(!code) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Code not found!')], flags: [MessageFlags.Ephemeral] });
        await code.deleteOne();

        sendModLogMessage({
            logType: ModLogType.DeleteGiftCode,
            staff: await player.getGameProfile(),
            discord: true,
            code: code
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The code was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}