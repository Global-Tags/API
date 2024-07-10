import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, Role } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { capitalize } from "../commands/PlayerInfo";

export default class EditRoles extends Button {
    constructor() {
        super("editRoles");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.isAdmin()) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const options = Object.keys(Role).filter(key => isNaN(Number(key))).map(role => {
            return {
                label: capitalize(role),
                value: role.toUpperCase(),
                default: player.roles.includes(role.toUpperCase())
            }
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents([
            new StringSelectMenuBuilder()
            .setCustomId('editRoles')
            .setMinValues(0)
            .setMaxValues(options.length)
            .setPlaceholder('Select roles...')
            .setOptions(options)
        ]);

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setURL(player.uuid).setTitle('Edit roles')], components: [row], ephemeral: true });
    }
}