import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class DeleteApiKeyMenu extends SelectMenu {
    constructor() {
        super({
            id: 'deleteApiKey',
            requiredPermissions: [Permission.ManageApiKeys]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();

        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const key = target.api_keys.find((key) => key.name == values[0]);
        if(!key) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Key not found!')], flags: [MessageFlags.Ephemeral] });
        target.api_keys = target.api_keys.filter((k) => k.name != key.name);
        await target.save();

        sendModLogMessage({
            logType: ModLogType.DeleteApiKey,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            key: key.name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The key was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}