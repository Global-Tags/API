import { t } from "elysia";
import { colorCodesWithSpaces, hexColorCodesWithSpaces, stripColors } from "../../../libs/chat-color";
import { config } from "../../../libs/config";
import { Permission } from "../../../types/Permission";
import { GlobalIcon, icons } from "../../../types/GlobalIcon";
import { formatUUID, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { getOrCreatePlayer, Player } from "../../../libs/database/schemas/Player";
import { tHeaders, tParams, tRequestBody, tResponseBody } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { customIconFile } from "../../../libs/data-accessor";
import { GlobalPosition, positions } from "../../../types/GlobalPosition";

const { validation, strictAuth } = config;
const { min, max, blacklist, watchlist } = validation.tag;
const multipleSpaces = /\s{2,}/g;

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get player info
    if(strictAuth) {
        if(!session?.uuid) return status(403, { error: i18n('$.error.notAllowed') });
    }

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNoTag') });

    if(player.icon.type == GlobalIcon.Custom) {
        if(!player.hasPermission(Permission.CustomIcon)) {
            player.icon.type = GlobalIcon.None;
            player.markModified('icon');
            await player.save();
        }
    }

    return {
        uuid: formatUUID(player.uuid),
        tag: player.isBanned() ? null : player.tag || null,
        position: player.position,
        icon: player.icon,
        roleIcon: player.getActiveRoles().find((role) => role.role.hasIcon)?.role.name || null,
        roles: player.getActiveRoles().map((role) => role.role.name),
        permissions: player.getActiveRoles().reduce((acc, role) => acc | role.role.permissions, 0),
        referrals: {
            has_referred: await player.hasReferrer(),
            total_referrals: player.referrals.total.length,
            current_month_referrals: player.referrals.current_month
        }
    };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Get a players\' tag info'
    },
    response: {
        200: tResponseBody.TagData,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders,
}).get('/history', async ({ session, params, i18n, status }) => { // Get player's tag and icon history
    if(!session || session?.self && !session.player?.hasPermission(Permission.ViewTagHistory)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNoTag') });

    return player.tag_history.map((tag) => ({
        tag: tag.content,
        timestamp: tag.timestamp.getTime(),
        flagged_words: watchlist.filter((entry) => stripColors(tag.content).trim().toLowerCase().includes(entry))
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Get a players\' tag history'
    },
    response: {
        200: t.Array(t.Object({ tag: t.String(), timestamp: t.Number(), flagged_words: t.Array(t.String()) }), { description: 'The tag history' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders,
}).post('/', async ({ session, params, i18n, status }) => { // Create account
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerTags)) return status(403, { error: i18n('$.error.notAllowed') });

    if(await Player.exists({ uuid: stripUUID(params.uuid) })) return status(409, { error: i18n('$.account.create.account_already_exists') });
    await Player.create({ uuid: stripUUID(params.uuid) });

    if(!session.self && session.player) {
        // TODO: notification
    }

    return {
        message: i18n('$.account.create.success'),
    }
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Create an account'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        409: tResponseBody.Error
    },
    params: tParams.uuid,
    headers: tHeaders
}).patch('/', async ({ session, body: { tag, position, icon }, params, i18n, status }) => { // Update settings
    if(!session || !session.self && !session.player?.hasPermission(Permission.ManagePlayerTags)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await getOrCreatePlayer(params.uuid);
    if(session.self && player.isBanned()) return status(403, { error: i18n('$.error.banned') });

    const errors: {
        tag: string | null;
        position: string | null;
        icon: string | null;
    } = {
        tag: null,
        position: null,
        icon: null
    }

    if(tag !== undefined) {
        if(tag !== null && !session.player?.hasPermission(Permission.BypassValidation)) {
            tag = tag.trim()
                .replace(multipleSpaces, ' ')
                .replace(colorCodesWithSpaces, '')
                .replace(hexColorCodesWithSpaces, '');

            const strippedTag = stripColors(tag);
            const blacklistedWord = blacklist.find((word) => strippedTag.toLowerCase().includes(word));

            if(strippedTag.length < min || strippedTag.length > max){
                errors.tag = i18n('$.set_tag.validation').replace('<min>', String(min)).replace('<max>', String(max)); 
            } else if(blacklistedWord) {
                errors.tag = i18n('$.set_tag.blacklisted_word').replaceAll('<word>', blacklistedWord);
            }
        }
        if(!errors.tag && player.tag !== tag) {
            player.changeTag(tag);
        }
    }
    if(position !== undefined) {
        const globalPosition = position.toLowerCase() as GlobalPosition;
        if(!positions.includes(globalPosition)) {
            errors.position = i18n('$.position.invalid');
        } else {
            player.position = globalPosition;
            player.markModified('position');
        }
    }
    if(icon !== undefined) {
        // TODO: Remove comment when permissions are done
        const hasCustomIconPermission = !session.self || true//session.player?.hasPermission(Permission.CustomIcon) || session.player?.hasPermission(Permission.BypassValidation);
        if(icon.hash !== undefined) {
            if(!hasCustomIconPermission) {
                errors.icon = i18n('$.icon.upload.notAllowed');
            } else if(icon.hash != null && (icon.hash.trim().length < 1 || !(await customIconFile(player.uuid, icon.hash).exists()))) {
                errors.icon = i18n('$.icon.upload.notFound');
            } else if(player.icon.hash !== icon.hash) {
                player.icon.hash = icon.hash;
                player.markModified('icon');
            }
        }
        if(icon.type !== undefined && !errors.icon) {
            const globalIcon = icon.type.toLowerCase() as GlobalIcon;

            if(!icons.includes(globalIcon)) {
                errors.icon = i18n('$.icon.not_allowed');
            } else if(!hasCustomIconPermission && globalIcon === GlobalIcon.Custom) {
                errors.icon = i18n('$.icon.upload.notAllowed');
            } else if(globalIcon === GlobalIcon.Custom && !player.icon.hash) {
                if(player.icon.type === GlobalIcon.Custom) {
                    player.icon.type = GlobalIcon.None;
                    player.markModified('icon');
                }
                errors.icon = i18n('$.icon.upload.noHash');
            } else if(player.icon.type !== globalIcon) {
                player.icon.type = globalIcon;
                player.markModified('icon');
            }
        }
    }
    if(player.isModified()) player.save();

    if(!session.self && session.player) {
        // TODO: notification
    }

    return {
        errors,
        data: {
            tag: player.tag,
            position: player.position,
            icon: player.icon,
        }
    };
}, {
    detail: {
        tags: [DocumentationCategory.Tags],
        description: 'Change your GlobalTag settings'
    },
    response: {
        200: tResponseBody.EditTagSettings,
        403: tResponseBody.Error
    },
    params: tParams.uuid,
    body: tRequestBody.TagSettings,
    headers: tHeaders
});