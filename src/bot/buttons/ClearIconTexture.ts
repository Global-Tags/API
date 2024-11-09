import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import Button from "../structs/Button";
import players, { Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";

export default class ClearIconTexture extends Button {
    constructor() {
        super('clearIconTexture');
    }
    
    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(!player.icon.hash) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player does not have a custom icon!`)], ephemeral: true });
        const oldHash = player.icon.hash;

        player.icon.hash = null;
        await player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.ClearIconTexture,
            uuid: player.uuid,
            staff: staff.uuid,
            icons: {
                old: {
                    name: player.icon.name,
                    hash: oldHash
                },
                new: {
                    name: player.icon.name,
                    hash: null
                }
            },
            discord: true
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The icon texture was successfully reset!`)], ephemeral: true });
    }
}