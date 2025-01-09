import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { Permission } from "../../types/Permission";
import roles, { getCachedRoles, getNextPosition, updateRoleCache } from "../../database/schemas/roles";
import { snakeCase } from "change-case";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class RenameRole extends Modal {
    constructor() {
        super('renameRole');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)] });
        if(!staff.hasPermissionSync(Permission.ManageRoles)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)] });

        const name = snakeCase(fields.getTextInputValue('name').trim());
        const roles = getCachedRoles();
        const role = getCachedRoles().find((role) => role.name == message.embeds[1].footer!.text);

        if(!role) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')] });
        if(roles.some((role) => role.name == name)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The role \`${name}\` already exists!`)] });

        sendModLogMessage({
            logType: ModLogType.RenameRole,
            staff: await getProfileByUUID(staff.uuid),
            discord: true,
            names: {
                old: role.name,
                new: name
            }
        });
    
        role.name = name;
        role.save();
        updateRoleCache();

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The role was successfully renamed!`)] });
    }
}