import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields, MessageFlags } from "discord.js";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export default class EditRoleNote extends Modal {
    constructor() {
        super('editRoleNote');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ 'connections.discord.id': user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You need to link your Minecraft account with `/link`!')], flags: [MessageFlags.Ephemeral] });
        if(!staff.hasPermission(Permission.ManageNotes)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ You\'re not allowed to perform this action!')], flags: [MessageFlags.Ephemeral] });

        const player = await players.findOne({ uuid: stripUUID(message.embeds[0].author!.name) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ Player not found!')], flags: [MessageFlags.Ephemeral] });

        const role = player.getRole(message.embeds[0].footer!.text);
        if(!role) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The role is not active!')], flags: [MessageFlags.Ephemeral] });
        const profile = await GameProfile.getProfileByUUID(player.uuid);

        let note: string | null = fields.getTextInputValue('note');
        if(note.trim() == '') note = null;

        sendModLogMessage({
            logType: ModLogType.EditRoleNote,
            staff: profile,
            user: await GameProfile.getProfileByUUID(player.uuid),
            discord: true,
            role: role.role.name,
            note
        });

        role.reason = note != null ? `${profile.getUsernameOrUUID()}: ${note}` : null;
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ The note note was successfully updated!')], flags: [MessageFlags.Ephemeral] });
    }
}