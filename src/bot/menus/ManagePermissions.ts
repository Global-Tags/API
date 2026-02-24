import { StringSelectMenuInteraction, Message, GuildMember, EmbedBuilder, MessageFlags } from "discord.js";
import SelectMenu from "../structs/SelectMenu";
import { PlayerDocument } from "../../database/schemas/Player";
import { colors } from "../bot";
import { Permission } from "../../types/Permission";

export default class ManagePermissionsMenu extends SelectMenu {
    constructor() {
        super({
            id: 'managePermissions_',
            requiredPermissions: [Permission.EditRoles]
        });
    }

    async selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: PlayerDocument) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Permission management is disabled!')], flags: [MessageFlags.Ephemeral] });
    }
}