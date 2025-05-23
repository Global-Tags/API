import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { snakeCase } from "change-case";

export default class CreateApiKeyModal extends Modal {
    constructor() {
        super({
            id: 'createApiKey_',
            requiredPermissions: [Permission.ManageApiKeys]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: interaction.customId.split('_')[1] });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });
        const name = snakeCase(fields.getTextInputValue('name').trim());

        if(target.api_keys.find((key) => key.name == name)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ An API key with this name already exists!')], flags: [MessageFlags.Ephemeral] });

        sendModLogMessage({
            logType: ModLogType.CreateApiKey,
            staff: await player.getGameProfile(),
            user: await target.getGameProfile(),
            discord: true,
            key: name
        });

        const key = target.createApiKey(name);
        target.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The API key was successfully created!\n\n\🔑 ||${key}||`).setFooter({ text: 'The key is only shown once, so save it securely!' })], flags: [MessageFlags.Ephemeral] });
    }
}