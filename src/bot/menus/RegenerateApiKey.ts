import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";

export default class RegenerateApiKeyMenu extends SelectMenu {
    constructor() {
        super({
            id: 'regenerateApiKey',
            requiredPermissions: [Permission.ManageApiKeys]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();

        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const key = target.api_keys.find((key) => key.name == values[0]);
        if(!key) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Key not found!')], flags: [MessageFlags.Ephemeral] });
        key.key = `sk_${generateSecureCode(32)}`;
        await target.save();

        sendModLogMessage({
            logType: ModLogType.RegenerateApiKey,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            key: key.name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The key was successfully regenerated!\n\n🔑 ||${key.key}||`).setFooter({ text: 'The key is only shown once, so save it securely!' })], flags: [MessageFlags.Ephemeral] });
    }
}