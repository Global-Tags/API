import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import codeSchema from "../../database/schemas/gift-codes";

export default class DeleteGiftCode extends Button {
    constructor() {
        super('deleteGiftCode');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageGiftCodes)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[1])
            .setTitle('Delete gift code')
            .setDescription('Here you can select a gift code to be deleted.');

        const codes = await codeSchema.find();
        const codeMap = codes.filter((code) => code.isValid()).map((code) => ({
            value: code.code,
            label: code.name,
            description: `Uses: ${code.uses.length}/${code.max_uses}. Expires at: ${code.expires_at ? code.expires_at.toDateString() : 'Never'}`,
            emoji: '🎁'
        }));

        if(codeMap.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ There are no codes to select!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('deleteGiftCode')
                .setPlaceholder('Select a code to delete...')
                .setMinValues(1)
                .setMaxValues(1)
                .setOptions(codeMap)
            );

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}