import { ModalSubmitInteraction, CacheType, Message, ModalSubmitFields, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import Modal from "../structs/Modal";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import ms, { StringValue } from "ms";
import { createGiftCode } from "../../database/schemas/gift-codes";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { GameProfile } from "../../libs/game-profiles";

export default class CreateGiftCode extends Modal {
    constructor() {
        super('createGiftCode_');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageBans)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const name = fields.getTextInputValue('name');
        const role = interaction.customId.split('_')[1];
        const maxUses = parseInt(fields.getTextInputValue('uses') || '1');
        const codeDuration = fields.getTextInputValue('codeDuration');
        const giftDuration = fields.getTextInputValue('giftDuration');

        if(isNaN(maxUses)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The max uses have to be a number!')], flags: [MessageFlags.Ephemeral] });

        const codeExpiresAt = codeDuration.trim() != '' ? new Date(Date.now() + ms(codeDuration as StringValue)) : null;
        if(codeExpiresAt && isNaN(codeExpiresAt.getTime())) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid code expiration date!')], flags: [MessageFlags.Ephemeral] });

        const giftExpiresAt = giftDuration.trim() != '' ? ms(giftDuration as StringValue) || NaN : null;
        if(giftExpiresAt != null && isNaN(giftExpiresAt)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Invalid gift expiration date!')], flags: [MessageFlags.Ephemeral] });

        const code = await createGiftCode({
            name,
            maxUses,
            gift: {
                type: 'role',
                value: role,
                duration: giftExpiresAt
            },
            expiresAt: codeExpiresAt
        });

        sendModLogMessage({
            logType: ModLogType.CreateGiftCode,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            discord: true,
            code: name,
            role,
            maxUses,
            codeExpiration: codeExpiresAt,
            giftDuration: giftExpiresAt
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The code was successfully created!\n\n🎁 ||**${code}**||`)], flags: [MessageFlags.Ephemeral] });
    }
}