import { ApplicationCommandOptionType, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, MessageFlags, User } from "discord.js";
import Command from "../structs/Command";
import players from "../../database/schemas/players";
import { colors, images } from "../bot";
import giftCodes from "../../database/schemas/gift-codes";
import { formatTimestamp } from "../../libs/discord-notifier";
import { capitalCase } from "change-case";

export default class Link extends Command {
    constructor() {
        super(
            'redeem',
            'Redeem a gift code.',
            [
                {
                    name: 'code',
                    description: 'The code you want to redeem.',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        );
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, user: User) {
        const player = await players.findOne({ 'connections.discord.id': user.id });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });

        const code = await giftCodes.findOne({ code: options.getString('code', true) });
        if(!code || !code.isValid()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Code not found!')], flags: [MessageFlags.Ephemeral] });
        if(code.uses.includes(player.uuid)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You already redeemed this code!')], flags: [MessageFlags.Ephemeral] });

        const { success, expiresAt } = player.addRole({ name: code.gift.value, reason: `Gift code: ${code.code}`, autoRemove: false, duration: code.gift.duration });
        if(!success) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You already have this role!')], flags: [MessageFlags.Ephemeral] });
        code.uses.push(player.uuid);
        await player.save();
        await code.save();

        const header = new EmbedBuilder()
            .setColor(colors.standart)
            .setImage(images.giftCodes)

        const embed = new EmbedBuilder()
            .setColor(colors.standart)
            .setTitle(`🎁 Successfully redeemed code \`${code.name}\`!`)
            .setDescription(`You received the **${capitalCase(code.gift.value)}** role **${code.gift.duration ? 'temporarily' : 'permanently'}**!\n${expiresAt ? `The role will expire on ${formatTimestamp(expiresAt)} (${formatTimestamp(expiresAt, 'R')})` : ''}`)
            .setImage(images.placeholder);

        interaction.reply({ embeds: [header, embed], flags: [MessageFlags.Ephemeral] });
    }
}