import { ButtonInteraction, CacheType, Message, GuildMember, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder } from "discord.js";
import Button from "../structs/Button";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class EditRoleExpiration extends Button {
    constructor() {
        super('editRoleExpiration');
    }

    async trigger(interaction: ButtonInteraction<CacheType>, message: Message<boolean>, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = player.roles.find(role => role.name == message.embeds[0].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });

        const input = new TextInputBuilder()
            .setLabel('Duration')
            .setCustomId('duration')
            .setPlaceholder('6h, 2d, 4w, etc. Leave empty to remove')
            .setRequired(false)
            .setMaxLength(50)
            .setStyle(TextInputStyle.Short);

        if(role.expires_at) input.setValue((role.expires_at.getTime() - Date.now()).toString());

        interaction.showModal(
            new ModalBuilder()
                .setTitle('Edit role expiration date')
                .setCustomId('editRoleExpiration')
                .addComponents(
                    new ActionRowBuilder<TextInputBuilder>()
                        .addComponents(input)
                )
        );
    }
}