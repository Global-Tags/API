import { Message, GuildMember, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { Permission } from "../../types/Permission";
import roles, { getNextPosition, updateRoleCache } from "../../database/schemas/roles";
import { snakeCase } from "change-case";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { GameProfile } from "../../libs/game-profiles";

export default class CreateRoleModal extends Modal {
    constructor() {
        super({
            id: 'createRole',
            requiredPermissions: [Permission.ManageRoles]
        });
    }

    async submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: Player) {
        const name = snakeCase(fields.getTextInputValue('name').trim());

        if(await roles.exists({ name })) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The role \`${name}\` already exists!`)], flags: [MessageFlags.Ephemeral] });

        await roles.insertMany([{
            name,
            position: await getNextPosition(),
            hasIcon: false,
            permissions: []
        }]);
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.CreateRole,
            staff: await player.getGameProfile(),
            discord: true,
            role: name
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The role \`${name}\` was successfully created!`)], flags: [MessageFlags.Ephemeral] });
    }
}