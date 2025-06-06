import { ButtonInteraction, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import Button from "../structs/Button";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { capitalCase } from "change-case";

export default class CreateGiftCodeButton extends Button {
    constructor() {
        super({
            id: 'createGiftCode',
            requiredPermissions: [Permission.ManageGiftCodes]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const embed = new EmbedBuilder()
            .setColor(colors.gray)
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

        interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
}