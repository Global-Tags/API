import { t } from "elysia";
import { config } from "./config";
import { generateDocumentId, generateSecureCode } from "./crypto";
import { AccountLockType } from "./database/schemas/Player";
const { validation } = config;

export const tId = t.String({
    default: generateDocumentId()
});

export const tUUID = t.String({
    default: '00000000-0000-0000-0000-000000000000'
});

export const tString = t.String({ default: '…' });

export const tTimestamp = t.Integer({
    default: Date.now()
});

export const tHeaders = t.Object({
    authorization: t.String({ error: '$.error.not_allowed', description: 'Your authentication token' }),
    'x-language': t.Optional(t.String({ default: 'en_us', description: 'The language to use for translations' }))
});

export namespace tParams {
    const id = (type: string) => t.Object({ id: t.String({ description: type }) });
    const uuidAnd = (params: any) => t.Object({ uuid: t.String({ description: 'A player UUID' }), ...params });
    const uuidAndId = (type: string) => uuidAnd({ id: id(type) });

    export const uuid = uuidAnd({});
    export const uuidAndApiKeyId = uuidAndId('An API Key ID');
    export const uuidAndBanId = uuidAndId('A ban ID');
    export const uuidAndLockId = uuidAndId('A lock ID');
    export const uuidAndNoteId = uuidAndId('A note ID');
    export const uuidAndIconHash = uuidAnd({ hash: t.String({ description: 'An icon hash' }) });
    export const uuidAndReportId = uuidAndId('A report ID');
    export const giftCodeId = id('A gift code ID');
    export const reportId = id('A report ID');
    export const roleId = id('A role ID');
}

// Do not use any types with default values here as it will override optional values on requests
export namespace tRequestBody {
    export const options = {
        additionalProperties: true
    };

    export const ApiKey = t.Object({
        name: t.String({ description: 'An API key name' })
    }, { description: 'An API key object', ...options });
    
    export const AppealBan = t.Object({
        reason: t.String()
    }, { description: 'A ban appeal object', ...options });

    export const CreateBan = t.Object({
        reason: t.String({ minLength: 1, description: 'A ban reason' }),
        appealable: t.Optional(t.Boolean({ description: 'A boolean indicating if the ban is appealable' })),
        duration: t.Optional(t.Number({ description: 'A ban duration' }))
    }, { description: 'A ban creation object', ...options });

    export const EditBan = t.Object({
        reason: t.Optional(t.String({ minLength: 1, description: 'A ban reason' })),
        appealable: t.Optional(t.Boolean({ description: 'A boolean indicating if the ban is appealable' }))
    }, { description: 'A ban edit object', ...options });

    export const UploadCustomIcon = t.Object({
        image: t.File({ type: 'image/png', description: 'A png image file' })
    }, { description: 'A custom icon upload object', ...options });

    export const CreateLock = t.Object({
        type: t.Enum(AccountLockType),
        reason: t.String({ maxLength: validation.notes.maxLength, description: 'A lock reason' }),
        duration: t.Optional(t.Number({ description: 'A lock duration' }))
    }, { description: 'A lock creation object', ...options });

    export const EditLock = t.Object({
        reason: t.Optional(t.String({ maxLength: validation.notes.maxLength, description: 'A lock reason' }))
    }, { description: 'A lock edit object', ...options });

    export const Note = t.Object({
        content: t.String({ maxLength: validation.notes.maxLength, description: 'A player note' })
    }, { description: 'A note object', ...options });

    export const Referral = t.Object({
        referrer: t.String({ description: 'The referrer player UUID' })
    }, { description: 'A referral object', ...options });

    export const Report = t.Object({
        reason: t.String({ description: 'A report reason' })
    }, { description: 'A report object', ...options });

    export const TagSettings = t.Object({
        tag: t.Optional(t.Nullable(t.String({ description: 'The tag content' }))),
        position: t.Optional(t.String({ description: 'The position of the tag' })),
        icon: t.Optional(t.Object({
            type: t.Optional(t.String({ description: 'The type of the icon' })),
            hash: t.Optional(t.Nullable(t.String({ description: 'The hash of the icon' })))
        })),
    }, { description: 'A tag settings object', ...options });

    export const CreateGiftCode = t.Object({
        name: t.String(),
        code: t.Optional(t.String()),
        role: t.String(),
        max_uses: t.Number(),
        code_expiration: t.Optional(t.Number()),
        gift_duration: t.Optional(t.Number())
    }, { description: 'A gift code creation object', ...options });

    export const CreateRole = t.Object({
        name: t.String(),
        color: t.Optional(t.Nullable(t.String({ minLength: 6, maxLength: 6 }))),
        permissions: t.Optional(t.Integer())
    }, { description: 'A role object', ...options });

    export const EditRole = t.Object({
        name: t.Optional(t.String()),
        color: t.Optional(t.Nullable(t.String({ minLength: 6, maxLength: 6 }))),
        permissions: t.Optional(t.Integer())
    }, { description: 'A role object', ...options });

    export const UploadRoleIcon = t.Object({
        image: t.File({ type: 'image/png', description: 'A png image file' })
    }, { description: 'A role icon upload object', ...options });

    export const ReorderRoles = t.Array(t.String({
        description: 'A role ID',
    }), { description: 'A role order array', ...options });

    export const StaffCategory = t.Object({
        name: t.String({ minLength: 1 })
    }, { description: 'A staff category object', ...options });

    export const CreateStaffMember = t.Object({
        uuid: t.String(),
        category: t.String(),
        description: t.Optional(t.Nullable(t.String()))
    }, { description: 'A staff member creation object', ...options });

    export const EditStaffMember = t.Object({
        category: t.Optional(t.String()),
        description: t.Optional(t.Nullable(t.String()))
    }, { description: 'A staff member edit object', ...options });
}

export namespace tResponseBody {
    export const Message = t.Object({
        message: t.String({ default: 'Some message', description: 'The message to be returned' })
    }, { description: 'A message object' });

    export const MessageWithExpiration = t.Object({
        message: t.String({ default: 'Some message', description: 'The message to be returned' }),
        expires_at: t.Nullable(tTimestamp)
    }, { description: 'A message object with an expiration timestamp' });

    export const Error = t.Object({
        error: t.String({ default: 'Some error', description: 'The error message to be returned' })
    }, { description: 'An error object' });

    export const IconList = t.Array(t.String(), { description: 'A list of icon hashes' });

    export const TagData = t.Object({
        uuid: tUUID,
        tag: t.Nullable(tString),
        position: t.String({ default: 'above', description: 'The position of the tag' }),
        icon: t.Object({
            type: t.String({ default: 'none', description: 'The type of the icon' }),
            hash: t.Nullable(t.String({ default: generateSecureCode(32), description: 'The hash of the icon' }))
        }),
        referrals: t.Object({
            has_referred: t.Boolean(),
            total_referrals: t.Integer(),
            current_month_referrals: t.Integer()
        }),
        roleIcon: t.Nullable(tString),
        roles: t.Array(t.String()),
        permissions: t.Integer()
    }, { description: 'A tag data object' });

    export const EditTagSettings = t.Object({
        errors: t.Object({
            tag: t.Nullable(tString, { description: 'An error message for the tag' }),
            position: t.Nullable(tString, { description: 'An error message for the position' }),
            icon: t.Nullable(tString, { description: 'An error message for the icon' })
        }, { description: 'A list of errors that occurred during the update' }),
        data: t.Object({
            tag: t.Nullable(tString),
            position: t.String({ default: 'above', description: 'The position of the tag' }),
            icon: t.Object({
                type: t.String({ default: 'none', description: 'The type of the icon' }),
                hash: t.Optional(t.Nullable(t.String({ default: generateSecureCode(32), description: 'The hash of the icon' })))
            })
        }, { description: 'The updated tag settings' })
    }, { description: 'An edit tag settings response object' });

    export const ApiInfo = t.Object({
        version: t.String({ default: config.version, description: 'The API version' }),
        requests: t.Number({ default: 0, description: 'The amount of requests made since the start of the day' })
    }, { description: 'An API info object' });

    export const StaffList = t.Array(t.Object({
        id: tId,
        name: tString,
        members: t.Array(t.Object({
            uuid: tUUID,
            description: t.Nullable(tString),
            avatar_url: tString,
            joined_at: tTimestamp
        }))
    }), { description: 'A staff category list with members' });
}

export namespace tSchema {
    export const PublicApiKey = t.Object({
        id: tId,
        name: tString,
        created_at: tTimestamp,
        last_used: t.Nullable(tTimestamp)
    }, { description: 'An API key object' });

    export const PrivateApiKey = t.Object({
        id: tId,
        name: tString,
        key: t.String({ default: `sk_${generateSecureCode(32)}` }),
        created_at: tTimestamp,
        last_used: t.Nullable(tTimestamp)
    }, { description: 'An API key object' });

    export const Ban = t.Object({
        id: tId,
        reason: tString,
        staff: tUUID,
        appealable: t.Boolean({ default: true }),
        appealed: t.Boolean({ default: false }),
        banned_at: tTimestamp,
        expires_at: t.Nullable(tTimestamp)
    }, { description: 'A ban object' });

    export const Lock = t.Object({
        id: tId,
        type: t.Enum(AccountLockType),
        reason: tString,
        staff: tUUID,
        locked_at: tTimestamp,
        expires_at: t.Nullable(tTimestamp)
    }, { description: 'A lock object' });

    export const Note = t.Object({
        id: tId,
        text: tString,
        author: tUUID,
        created_at: tTimestamp
    }, { description: 'A note object' });

    export const TagContext = t.Object({
        tag: tString,
        position: t.String({ default: 'above' }),
        icon: t.Object({
            type: t.String({ default: 'none' }),
            hash: t.Nullable(t.String({ default: generateSecureCode(32) }))
        })
    });

    export const Report = t.Object({
        id: tId,
        reported_uuid: tUUID,
        reporter_uuid: tUUID,
        reason: tString,
        context: TagContext,
        is_resolved: t.Boolean(),
        created_at: tTimestamp,
        last_updated: tTimestamp
    });

    export const GiftCode = t.Object({
        id: tId,
        name: tString,
        code: t.String({ default: generateSecureCode(12) }),
        uses: t.Array(t.String()),
        max_uses: t.Number(),
        gift: t.Object({
            type: t.String({ default: 'role' }),
            value: tString,
            duration: t.Nullable(t.Number())
        }),
        created_by: tUUID,
        created_at: tTimestamp,
        expires_at: t.Nullable(tTimestamp)
    }, { description: 'A gift code object' });

    export const Metric = t.Object({
        time: tTimestamp,
        users: t.Number(),
        tags: t.Number(),
        admins: t.Number(),
        bans: t.Number(),
        downloads: t.Object({ flintmc: t.Number(), modrinth: t.Number() }),
        ratings: t.Object({ flintmc: t.Number() }),
        daily_requests: t.Number(),
        positions: t.Object({}, { default: {}, additionalProperties: true, description: 'All position counts' }),
        icons: t.Object({}, { default: {}, additionalProperties: true, description: 'All icon counts' })
    }, { description: 'A metric object' });

    export const Role = t.Object({
        id: tId,
        name: tString,
        position: t.Integer(),
        hasIcon: t.Boolean(),
        color: t.Nullable(t.String()),
        permissions: t.Number()
    }, { description: 'A role object' });

    export const StaffMember = t.Object({
        uuid: tUUID,
        username: tString,
        category: tString,
        description: t.Nullable(tString),
        joined_at: tTimestamp
    }, { description: 'A staff member object' });

    export const StaffCategory = t.Object({
        id: tId,
        name: tString,
        position: t.Integer()
    }, { description: 'A staff category object' });

    export const MemberlistStaffCategory = t.Object({
        id: tId,
        name: tString,
        position: t.Integer(),
        members: t.Integer()
    }, { description: 'A staff category object' });
}