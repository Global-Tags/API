import { ButtonInteraction, Message, GuildMember, EmbedBuilder, ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../structs/Button";
import players, { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import { stripUUID } from "../../libs/game-profiles";

export default class EditRoleExpirationButton extends Button {
    constructor() {
        super({
            id: 'editRoleExpiration',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player) {
        const target = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = target.getActiveRoles().find((role) => role.role.name == message.embeds[0].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });

        const input = new TextInputBuilder()
            .setLabel('Duration')
            .setCustomId('duration')
            .setPlaceholder('6h, 2d, 4w, etc. Leave empty to remove')
            .setRequired(false)
            .setMaxLength(50)
            .setStyle(TextInputStyle.Short);

        if(role.expiresAt) input.setValue((role.expiresAt.getTime() - Date.now()).toString());

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