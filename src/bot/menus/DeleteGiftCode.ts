import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import codeSchema from "../../database/schemas/gift-codes";

export default class DeleteGiftCodeMenu extends SelectMenu {
    constructor() {
        super({
            id: 'deleteGiftCode',
            requiredPermissions: [Permission.ManageGiftCodes]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();

        const code = await codeSchema.findOne({ code: values[0] });
        if(!code) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Code not found!')], flags: [MessageFlags.Ephemeral] });
        await code.deleteOne();

        sendModLogMessage({
            logType: ModLogType.DeleteGiftCode,
            staff: await player.getGameProfile(),
            discord: true,
            code: code.name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The code was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}