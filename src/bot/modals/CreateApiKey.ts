import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class CreateApiKey extends Modal {
    constructor() {
        super('createApiKey');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageApiKeys)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        const name = fields.getTextInputValue('name').trim();

        if(player.api_keys.find((key) => key.name.toLowerCase() == name.toLowerCase())) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ An API key with this name already exists!')], flags: [MessageFlags.Ephemeral] });

        sendModLogMessage({
            logType: ModLogType.CreateApiKey,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            user: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            key: name
        });

        const key = player.createApiKey(name);
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The API key was successfully created!\n\n\🔑 ||${key}||`).setFooter({ text: 'The key is only shown once, so save it securely!' })], flags: [MessageFlags.Ephemeral] });
    }
}