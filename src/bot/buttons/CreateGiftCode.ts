import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";

export default class CreateGiftCode extends Button {
    constructor() {
        super('createGiftCode');
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageGiftCodes)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const embed = EmbedBuilder.from(message.embeds[1])
            .setTitle('Create gift code')
            .setDescription('Here you can select a role to be given to the player when they redeem the gift code.');

        const roles = getCachedRoles().map((role) => ({
            label: capitalCase(role.name),
            value: role.name
        }));

        if(roles.length == 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ There are no roles to select!')], flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('createGiftCode')
                .setPlaceholder('Select a role for the gift code...')
                .setMinValues(0)
                .setMaxValues(1)
                .setOptions(roles)
            );

        interaction.reply({ embeds: [EmbedBuilder.from(message.embeds[0]), embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}