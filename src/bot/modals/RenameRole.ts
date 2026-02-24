import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { Permission } from "../../types/Permission";
import { snakeCase } from "change-case";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { getCachedRoles, Role } from "../../database/schemas/Role";

export default class RenameRoleModal extends Modal {
    constructor() {
        super({
            id: 'renameRole_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument) {
        const name = snakeCase(fields.getTextInputValue('name').trim());
        const roles = getCachedRoles();
        const role = await Role.findOne({ name: interaction.customId.split('_')[1] });

        if(!role) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')] });
        if(roles.some((role) => role.name == name)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The role \`${name}\` already exists!`)] });

        sendModLogMessage({
            logType: ModLogType.RenameRole,
            staff: await player.getGameProfile(),
            discord: true,
            names: {
                old: role.name,
                new: name
            }
        });
    
        role.rename(name);

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role was successfully renamed!')] });
    }
}