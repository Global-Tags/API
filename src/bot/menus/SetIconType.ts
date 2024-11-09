import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players, { Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { constantCase } from "change-case";
import { sendIconTypeChangeEmail } from "../../libs/Mailer";

export default class SetIconType extends SelectMenu {
    constructor() {
        super('setIconType');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        if(player.isBanned()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ This player is already banned!`)], ephemeral: true });

        const oldIcon = { ...player.icon };
        player.icon.name = constantCase(values[0]);
        await player.save();

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.ChangeIconType,
            uuid: player.uuid,
            staff: staff.uuid,
            icons: {
                old: {
                    name: oldIcon.name,
                    hash: oldIcon.hash
                },
                new: {
                    name: player.icon.name,
                    hash: player.icon.hash
                }
            },
            discord: true
        });

        if(player.isEmailVerified()) {
            sendIconTypeChangeEmail(player.connections.email.address!, oldIcon.name, player.icon.name);
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The players icon type was successfully updated!`)], ephemeral: true });
    }
}