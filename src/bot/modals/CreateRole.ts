import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { Permission } from "../../types/Permission";
import roles, { getNextPosition, updateRoleCache } from "../../database/schemas/roles";
import { snakeCase } from "change-case";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class CreateRole extends Modal {
    constructor() {
        super('createRole');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const name = snakeCase(fields.getTextInputValue('name').trim());

        if(await roles.exists({ name })) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The role \`${name}\` already exists!`)], ephemeral: true });

        await roles.insertMany([{
            name,
            position: await getNextPosition(),
            hasIcon: false,
            permissions: []
        }]);
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.CreateRole,
            staff: await getProfileByUUID(staff.uuid),
            discord: true,
            role: name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The role \`${name}\` was successfully created!`)], ephemeral: true });
    }
}