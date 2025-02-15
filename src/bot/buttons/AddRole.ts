import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { capitalCase, snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { stripUUID } from "../../libs/game-profiles";

export default class AddRole extends Button {
    constructor() {
        super('addRole');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const options = getCachedRoles().filter((role) => !player.getRoles().some((r) => r.role.name == role.name)).slice(0, 25).map(({ name: role }) => {
            role = snakeCase(role);
            return {
                label: capitalCase(role),
                value: role,
                default: player.getRoles().some((r) => snakeCase(r.role.name) == role)
            }
        });

        if(options.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ No roles to add!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents([
                new StringSelectMenuBuilder()
                    .setCustomId('addRole')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder('Select a role to add...')
                    .setOptions(options)
            ]);

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]).setTitle('Add role').setDescription('Please select a role to add!')], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}