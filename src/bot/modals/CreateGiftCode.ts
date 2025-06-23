import { ModalSubmitInteraction, Message, ModalSubmitFields, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import Modal from "../structs/Modal";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import ms, { StringValue } from "ms";
import { createGiftCode, GiftType } from "../../database/schemas/GiftCode";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";

export default class CreateGiftCodeModal extends Modal {
    constructor() {
        super({
            id: 'createGiftCode_',
            requiredPermissions: [Permission.CreateGiftCodes]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument) {
        const name = fields.getTextInputValue('name');
        const code = fields.getTextInputValue('code');
        const role = interaction.customId.split('_')[1];
        const maxUses = parseInt(fields.getTextInputValue('uses') || '1');
        const codeDuration = fields.getTextInputValue('codeDuration');
        const giftDuration = fields.getTextInputValue('giftDuration');

        if(isNaN(maxUses)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The max uses have to be a number!')], flags: [MessageFlags.Ephemeral] });

        const codeExpiresAt = codeDuration.trim() != '' ? new Date(Date.now() + ms(codeDuration as StringValue)) : null;
        if(codeExpiresAt && isNaN(codeExpiresAt.getTime())) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid code expiration date!')], flags: [MessageFlags.Ephemeral] });

        const giftExpiresAt = giftDuration.trim() != '' ? ms(giftDuration as StringValue) || NaN : null;
        if(giftExpiresAt != null && isNaN(giftExpiresAt)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid gift expiration date!')], flags: [MessageFlags.Ephemeral] });

        const giftCode = await createGiftCode({
            name,
            code: code?.trim() || undefined,
            maxUses,
            gift: {
                type: GiftType.Role,
                value: role,
                duration: giftExpiresAt
            },
            expiresAt: codeExpiresAt,
            createdBy: player.uuid
        });

        sendModLogMessage({
            logType: ModLogType.CreateGiftCode,
            staff: await player.getGameProfile(),
            discord: true,
            code: giftCode
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The code was successfully created!\n\n🎁 ||**${giftCode.code}**||`)], flags: [MessageFlags.Ephemeral] });
    }
}