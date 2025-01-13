import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";

export default class EditRoles extends Button {
    constructor() {
        super('editRoles');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll('`', '') });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], ephemeral: true });

        const options = getCachedRoles().slice(0, 25).map(({ name: role }) => {
            return {
                label: capitalCase(role),
                value: snakeCase(role),
                default: player.roles.some((r) => snakeCase(r.name) == snakeCase(role))
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