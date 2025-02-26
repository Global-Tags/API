import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, MessageFlags, User } from "discord.js";
import Command from "../structs/Command";
import players from "../../database/schemas/players";
import { colors, images } from "../bot";
import { Permission } from "../../types/Permission";
import giftCodes from "../../database/schemas/gift-codes";
import { formatTimestamp } from "../../libs/discord-notifier";

export default class Link extends Command {
    constructor() {
        super(
            'gift-codes',
            'Manage gift codes.',
            []
        );
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageGiftCodes)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const codes = await giftCodes.find();
        const codeMap = codes.filter((code) => code.isValid()).map((code) => 
            `↝ \`${code.name}\` [||**${code.code}**||] - \`${code.uses.length}/${code.max_uses}\` Uses${code.expires_at ? ` (Expires ${formatTimestamp(code.expires_at, 'R')})` : ''}`
        ).join('\n');

        const header = new EmbedBuilder()
            .setColor(colors.standart)
            .setImage(images.giftCodes)

        const embed = new EmbedBuilder()
            .setColor(colors.standart)
            .setTitle('🎁 Gift codes')
            .setDescription(`**Active gift codes**\n${codeMap.length == 0 ? '*No active gift codes.*' : codeMap}`)
            .setImage(images.placeholder);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Create gift code')
                    .setCustomId('createGiftCode')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Delete gift code')
                    .setCustomId('deleteGiftCode')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
            );

        interaction.reply({ embeds: [header, embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}