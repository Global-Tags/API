import { CacheType, Message, GuildMember, User, EmbedBuilder, ModalSubmitInteraction, ModalSubmitFields } from "discord.js";
import players, { Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import Modal from "../structs/Modal";
import { ModLogType, NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { sendTagChangeEmail } from "../../libs/Mailer";

export default class SetTag extends Modal {
    constructor() {
        super("setTag");
    }

    async submit(interaction: ModalSubmitInteraction<CacheType>, message: Message<boolean>, fields: ModalSubmitFields, member: GuildMember, user: User) {
        const staff = await players.findOne({ "connections.discord.id": user.id });
        if(!staff) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You need to link your Minecraft account with \`/link\`!`)], ephemeral: true });
        if(!staff.hasPermission(Permission.ManageTags)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to perform this action!`)], ephemeral: true });

        const player = await players.findOne({ uuid: message.embeds[0].fields[0].value.replaceAll(`\``, ``) });
        if(!player) return interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Player not found!`)], ephemeral: true });
        const tag = fields.getTextInputValue('tag');
        const oldTag = player.tag;

        sendMessage({
            type: NotificationType.ModLog,
            logType: ModLogType.ChangeTag,
            uuid: player.uuid,
            staff: staff.uuid,
            oldTag: player.tag || 'None',
            newTag: tag,
            discord: true
        });

        player.tag = tag;
        player.save();

        if(player.isEmailVerified()) {
            sendTagChangeEmail(player.connections.email.address!, oldTag || '---', tag);
        }

        interaction.reply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ The tag was successfully set!`)], ephemeral: true });
    }
}