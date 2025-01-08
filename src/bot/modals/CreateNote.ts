import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import players from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, sendModLogMessage } from "../../libs/discord-notifier";
import { Permission } from "../../types/Permission";
import { getProfileByUUID } from "../../libs/game-profiles";

export default class CreateNote extends Modal {
    constructor() {
        super('createNote');
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermissionSync(Permission.ManageNotes)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        const note = fields.getTextInputValue('note');

        sendModLogMessage({
            logType: ModLogType.CreateNote,
            staff: await getProfileByUUID(staff.uuid),
            user: await getProfileByUUID(player.uuid),
            discord: true,
            note
        });

        player.createNote({
            text: note,
            author: staff.uuid
        });
        player.save();

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The note was successfully added!`)], ephemeral: true });
    }
}