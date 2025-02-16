import { StringSelectMenuInteraction, Message, GuildMember, User, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import roles, { updateRoleCache } from "../../database/schemas/roles";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { GameProfile } from "../../libs/game-profiles";

export default class SetSku extends SelectMenu {
    constructor() {
        super('setSku');
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User) {
        if(values.length == 0) return interaction.deferUpdate();
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageRoles)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const role = await roles.findOne({ name: message.embeds[1].footer!.text });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const sku = values[0] || null;
        const old = role.sku || null;

        role.sku = sku;
        await role.save();
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.SetRoleSku,
            staff: await GameProfile.getProfileByUUID(staff.uuid),
            discord: true,
            role: role.name,
            sku: {
                old,
                new: sku
            }
        });

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The role SKU was successfully set!')], flags: [MessageFlags.Ephemeral] });
    }
}