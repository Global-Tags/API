import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { Permission } from "../../types/Permission";
import { getCachedRoles } from "../../database/schemas/roles";
import { snakeCase } from "change-case";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { GameProfile } from "../../libs/game-profiles";
import roleModel from "../../database/schemas/roles";

export default class RenameRoleModal extends Modal {
    constructor() {
        super({
            id: 'renameRole',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const name = snakeCase(fields.getTextInputValue('name').trim());
        const roles = getCachedRoles();
        const role = await roleModel.findOne({ name: message.embeds[1].footer!.text });

        if(!role) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')] });
        if(roles.some((role) => role.name == name)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The role \`${name}\` already exists!`)] });

        sendModLogMessage({
            logType: ModLogType.RenameRole,
            staff: await GameProfile.getProfileByUUID(player.uuid),
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