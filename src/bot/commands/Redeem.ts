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

        let expiration: Date | null = null;
        const role = player.roles.find(role => role.name == code.gift.value);
        if(role) {
            if(!role.expires_at) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You already have this role!')], flags: [MessageFlags.Ephemeral] });
            if(role.expires_at.getTime() > Date.now()) {
                expiration = code.gift.duration ? new Date(role.expires_at.getTime() + code.gift.duration) : null;
                role.reason += ` | Gift code: ${code.code}`;
                role.expires_at = expiration;
                await player.save();
            } else {
                expiration = code.gift.duration ? new Date(Date.now() + code.gift.duration) : null;
                role.expires_at = expiration;
                role.manually_added = false;
                role.reason = `Gift code: ${code.code}`;
                await player.save();
            }
        } else {
            expiration = code.gift.duration ? new Date(Date.now() + code.gift.duration) : null;
            player.roles.push({
                name: code.gift.value,
                added_at: new Date(),
                manually_added: false,
                reason: `Gift code: ${code.code}`,
                expires_at: expiration
            });
            await player.save();
        }
        code.uses.push(player.uuid);
        await code.save();

        const header = new EmbedBuilder()
            .setColor(colors.standart)
            .setImage(images.giftCodes)

        const embed = new EmbedBuilder()
            .setColor(colors.standart)
            .setTitle(`🎁 Successfully redeemed code \`${code.name}\`!`)
            .setDescription(`You received the **${capitalCase(code.gift.value)}** role **${code.gift.duration ? 'temporarily' : 'permanently'}**!\n${expiration ? `The role will expire on ${formatTimestamp(expiration)} (${formatTimestamp(expiration, 'R')})` : ''}`)
            .setImage(images.placeholder);

        interaction.reply({ embeds: [header, embed], flags: [MessageFlags.Ephemeral] });
    }
}