import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import players, { Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalize } from "../commands/PlayerInfo";
import { roles, bot } from "../../../config.json";

export default class EditRoles extends Button {
    constructor() {
        super("editRoles");
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });
        if(bot.synced_roles.enabled) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Synced roles are enabled!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });

        const options = roles.filter(key => isNaN(Number(key))).slice(0, 25).map(({ name: role }) => {
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

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]).setTitle('Edit roles')], components: [row], ephemeral: true });
    }
}