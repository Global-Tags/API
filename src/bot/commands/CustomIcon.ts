import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import Command, { CommandOptions } from "../structs/Command";
import { Player } from "../../database/schemas/players";
import { colors } from "../bot";
import { join } from 'path';
import axios from "axios";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";
import { config } from "../../libs/config";
import { Permission } from "../../types/Permission";
import { GlobalIcon } from "../../types/GlobalIcon";
import { sendCustomIconUploadMessage } from "../../libs/discord-notifier";
import { snakeCase } from "change-case";

export default class CustomIconCommand extends Command {
    constructor() {
        super({
            name: 'icon',
            description: 'Manage your custom icon if you\'re a partner or financial supporter.',
            options: [
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
            ],
            requiredPermissions: [Permission.CustomIcon]
        });
    }

    async execute(interaction: CommandInteraction, options: CommandOptions, member: GuildMember, player: Player) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const sub = options.getSubcommand();

        if(sub == 'toggle') {
            const shouldEnable = options.getBoolean('enable', true);
            player.icon.name = snakeCase(GlobalIcon[shouldEnable ? GlobalIcon.Custom : GlobalIcon.None]);
            await player.save();

            interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription(`✅ Your custom icon has been ${shouldEnable ? 'enabled' : 'disabled'}!`)] });
        } if(sub == 'upload') {
            const file = options.getAttachment('file', true);

            if(file.contentType != 'image/png') return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The file you uploaded is not a PNG image!')] });
            if(!file.height || file.height != file.width) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The file you uploaded is not a square image!')] });
            if(file.height > config.validation.icon.maxResolution) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`❌ The file you uploaded exceeds the max resolution of ${config.validation.icon.maxResolution}x${config.validation.icon.maxResolution}!`)] });

            const request = await axios.get(file.url, { responseType: 'arraybuffer' }).catch(() => null);
            if(!request) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.error).setDescription('❌ The upload failed, please try again!')] });

            player.icon.name = snakeCase(GlobalIcon[GlobalIcon.Custom]);
            player.icon.hash = generateSecureCode(32);
            await player.save();
            await Bun.write(Bun.file(join('icons', player.uuid, `${player.icon.hash}.png`)), request.data, { createPath: true });

            if(!player.hasPermission(Permission.BypassValidation)) sendCustomIconUploadMessage(
                await player.getGameProfile(),
                player.icon.hash
            );

            interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Your custom icon was successfully uploaded!\nYou may need to clear your cache ingame for the icon to be shown.').setThumbnail(`attachment://${file.name}`)], files: [file] });
        } else if(sub == 'unset') {
            player.icon.name = snakeCase(GlobalIcon[GlobalIcon.None]);
            player.icon.hash = null;
            await player.save();

            interaction.editReply({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('✅ Your custom icon was successfully unset!')] });
        }
    }
}