import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";
import roles, { updateRoleCache } from "../../database/schemas/roles";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";

export default class SetSkuMenu extends SelectMenu {
    constructor() {
        super({
            id: 'setSku_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player) {
        if(values.length == 0) return interaction.deferUpdate();

        const role = await roles.findOne({ name: interaction.customId.split('_')[1] });
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Role not found!')], flags: [MessageFlags.Ephemeral] });

        const sku = values[0] || null;
        const old = role.sku || null;

        role.sku = sku;
        await role.save();
        updateRoleCache();

        sendModLogMessage({
            logType: ModLogType.SetRoleSku,
            staff: await player.getGameProfile(),
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