import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import codeSchema from "../../database/schemas/gift-codes";
import { GameProfile } from "../../libs/game-profiles";

export default class DeleteGiftCode extends SelectMenu {
    constructor() {
        super('deleteGiftCode');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageGiftCodes)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const code = await codeSchema.findOne({ code: values[0] });
        if(!code) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Code not found!')], flags: [MessageFlags.Ephemeral] });
        await code.deleteOne();

        sendModLogMessage({
            logType: ModLogType.DeleteGiftCode,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            discord: true,
            code: code.name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The code was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}