import { ApplicationCommandOptionType, CacheType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, User } from "discord.js";
import Command from "../structs/Command";
import players, { GlobalIcon, Permission } from "../../database/schemas/players";
import { colors } from "../bot";
import { bot } from "../../../config.json";
import { constantCase } from "change-case";
import { join } from 'path';
import axios from "axios";
import { generateSecureCode } from "../../routes/connections";
import { NotificationType, sendMessage } from "../../libs/DiscordNotifier";
import { config } from "../../libs/Config";

export default class CustomIcon extends Command {
    constructor() {
        super(
            "icon",
            "Manage your custom icon if you're a partner or financial supporter.",
            [
                {
                    name: 'toggle',
                    description: 'Toggle your custom icon on or off.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'enable',
                            description: 'If you want to enable your custom icon or not.',
                            type: ApplicationCommandOptionType.Boolean,
                            required: true
                        }
                    ]
                },
                {
                    name: 'upload',
                    description: 'Upload a new icon which you want to use.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'file',
                            description: 'The new icon you want to use.',
                            type: ApplicationCommandOptionType.Attachment,
                            required: true
                        }
                    ]
                },
                {
                    name: 'unset',
                    description: 'Unset your current custom icon.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: []
                }
            ]
        );
    }

    async execute(interaction: CommandInteraction<CacheType>, options: CommandInteractionOptionResolver<CacheType>, member: GuildMember, user: User) {
        await interaction.deferReply({ ephemeral: true });
        if(!bot.connection.active) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Account linking is deactivated!`)] });

        const player = await players.findOne({ "connections.discord.id": user.id });
        if(!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Your account is not linked to a Minecraft account!`)] });
        if(player.isBanned()) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ Your account is banned!`)] });
        if(!player.hasPermissionSync(Permission.CustomIcon)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ You're not allowed to have a custom icon!`)] });
        const sub = options.getSubcommand();

        if(sub == 'toggle') {
            const shouldEnable = options.getBoolean('enable', true);
            player.icon.name = shouldEnable ? constantCase(GlobalIcon[GlobalIcon.Custom]) : constantCase(GlobalIcon[GlobalIcon.None]);
            await player.save();

            interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Your custom icon has been ${shouldEnable ? 'enabled' : 'disabled'}!`)] });
        } if(sub == 'upload') {
            const file = options.getAttachment('file', true);

            if(file.contentType != 'image/png') return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The file you uploaded is not a PNG image!`)] });
            if(!file.height || file.height != file.width) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The file you uploaded is not a square image!`)] });
            if(file.height > config.validation.icon.maxResolution) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The file you uploaded exceeds the max resolution of ${config.validation.icon.maxResolution}x${config.validation.icon.maxResolution}!`)] });

            const request = await axios.get(file.url, { responseType: 'arraybuffer' }).catch(() => null);
            if(!request) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The upload failed, please try again!`)] });

            player.icon.name = constantCase(GlobalIcon[GlobalIcon.Custom]);
            player.icon.hash = generateSecureCode(32);
            await player.save();
            await Bun.write(Bun.file(join('icons', player.uuid, `${player.icon.hash}.png`)), request.data, { createPath: true });

            sendMessage({
                type: NotificationType.CustomIconUpload,
                uuid: player.uuid,
                hash: player.icon.hash
            });

            interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Your custom icon was successfully uploaded!\nYou may need to clear your cache ingame for the icon to be shown.`).setThumbnail(`attachment://${file.name}`)], files: [file] });
        } else if(sub == 'unset') {
            player.icon.name = constantCase(GlobalIcon[GlobalIcon.None]);
            player.icon.hash = null;
            await player.save();

            interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Your custom icon was successfully unset!`)] });
        }
    }
}