import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { sendTagClearEmail } from "../../libs/mailer";
import { getI18nFunctionByLanguage } from "../../middleware/fetch-i18n";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class ClearTag extends Button {
    constructor() {
        super('clearTag');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        if(!player.tag) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ This player does not have a tag!')], flags: [MessageFlags.Ephemeral] });
        const oldTag = player.tag;

        player.clearTag(staff.uuid);
        await player.save();

        sendModLogMessage({
            logType: ModLogType.ClearTag,
            user: await GameProfile.getProfileByUUID(player.uuid),
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            discord: true
        });

        if(player.isEmailVerified()) {
            sendTagClearEmail(player.connections.email.address!, oldTag, getI18nFunctionByLanguage(player.last_language));
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The tag was successfully deleted!')], flags: [MessageFlags.Ephemeral] });
    }
}