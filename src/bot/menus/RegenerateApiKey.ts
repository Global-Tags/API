import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";

export default class RegenerateApiKey extends SelectMenu {
    constructor() {
        super('regenerateApiKey');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageApiKeys)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const key = player.api_keys.find((key) => key.name == values[0]);
        if(!key) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Key not found!')], flags: [MessageFlags.Ephemeral] });
        key.key = `sk_${generateSecureCode(32)}`;
        await player.save();

        sendModLogMessage({
            logType: ModLogType.RegenerateApiKey,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            user: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            key: key.name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The key was successfully regenerated!\n\n🔑 ||${key.key}||`).setFooter({ text: 'The key is only shown once, so save it securely!' })], flags: [MessageFlags.Ephemeral] });
    }
}