import { t } from "elysia";
import { config } from "./config";
import { generateSecureCode } from "./crypto";
const { validation } = config;

export const tId = t.String({
    default: generateSecureCode()
});

export const tUUID = t.String({
    default: '00000000-0000-0000-0000-000000000000'
});

export const tString = t.String({ default: '…' });

export const tTimestamp = t.Integer({
    default: Date.now()
});

export const tHeaders = t.Object({
    authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }),
    'x-language': t.Optional(t.String({ default: 'en_us', description: 'The language to use for translations' }))
}, { error: '$.error.notAllowed' });

export namespace tParams {
    const id = (type: string) => t.Object({ id: t.String({ description: type }) });
    const uuidAnd = (params: any) => t.Object({ uuid: t.String({ description: 'A player UUID' }), ...params });
    const uuidAndId = (type: string) => uuidAnd({ id: id(type) });

    export const uuid = uuidAnd({});
    export const uuidAndApiKeyId = uuidAndId('An API Key ID');
    export const uuidAndBanId = uuidAndId('A ban ID');
    export const uuidAndNoteId = uuidAndId('A note ID');
    export const uuidAndIconHash = uuidAnd({ hash: t.String({ description: 'An icon hash' }) });
    export const uuidAndReportId = uuidAndId('A report ID');
    export const giftCodeId = id('A gift code ID');
    export const reportId = id('A report ID');
    export const roleId = id('A role ID');
}

export namespace tRequestBody {
    export const options = {
        error: '$.error.invalidBody',
        additionalProperties: true
    };

    export const ApiKey = t.Object({
        name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]', description: 'An API key name' })
    }, { description: 'An API key object', ...options });
    
    export const AppealBan = t.Object({
        reason: t.String({ error: '$.error.wrongType;;[["field", "reason"], ["type", "string"]]' })
    }, { description: 'A ban appeal object', ...options });

    export const CreateBan = t.Object({
        reason: t.String({ minLength: 1, error: '$.error.wrongType;;[["field", "reason"], ["type", "string"]]', description: 'A ban reason' }),
        appealable: t.Optional(t.Boolean({ error: '$.error.wrongType;;[["field", "appealable"], ["type", "boolean"]]', description: 'A boolean indicating if the ban is appealable' })),
        duration: t.Optional(t.Number({ error: '$.error.wrongType;;[["field", "duration"], ["type", "number"]]', description: 'A ban duration' }))
    }, { description: 'A ban creation object', ...options });

    export const EditBan = t.Object({
        reason: t.Optional(t.String({ minLength: 1, error: '$.error.wrongType;;[["field", "reason"], ["type", "string"]]', description: 'A ban reason' })),
        appealable: t.Optional(t.Boolean({ error: '$.error.wrongType;;[["field", "appealable"], ["type", "boolean"]]', description: 'A boolean indicating if the ban is appealable' }))
    }, { description: 'A ban edit object', ...options });

    export const UploadCustomIcon = t.Object({
        image: t.File({ type: 'image/png', error: '$.error.wrongType;;[["field", "image"], ["type", "png file"]]', description: 'A png image file' })
    }, { description: 'A ban edit object', ...options });

    export const Note = t.Object({
        content: t.String({ maxLength: validation.notes.maxLength, error: `$.notes.create.max_length;;[["max", "${validation.notes.maxLength}"]]`, description: 'A player note' })
    }, { description: 'A note object', ...options });

    export const Report = t.Object({
        reason: t.String({ error: '$.error.wrongType;;[["field", "reason"], ["type", "string"]]', description: 'A report reason' })
    }, { description: 'A report object', ...options });

    export const CreateGiftCode = t.Object({
        name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }),
        code: t.Optional(t.String({ error: '$.error.wrongType;;[["field", "code"], ["type", "string"]]' })),
        role: t.String({ error: '$.error.wrongType;;[["field", "role"], ["type", "string"]]' }),
        max_uses: t.Number({ error: '$.error.wrongType;;[["field", "max_uses"], ["type", "number"]]' }),
        code_expiration: t.Optional(t.Number({ error: '$.error.wrongType;;[["field", "code_expiration"], ["type", "number"]]' })),
        gift_duration: t.Optional(t.Number({ error: '$.error.wrongType;;[["field", "gift_duration"], ["type", "number"]]' }))
    }, { description: 'A gift code creation object', ...options });

    export const Role = t.Object({
        name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }),
        color: t.Optional(t.Nullable(t.String({ minLength: 6, maxLength: 6, error: '$.error.wrongType;;[["field", "color"], ["type", "string"]]' }))),
        permissions: t.Optional(t.Integer({ error: '$.error.wrongType;;[["field", "permissions"], ["type", "integer"]]' }))
    }, { description: 'A role object', ...options });

    export const StaffCategory = t.Object({
        name: t.String({ minLength: 1, error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' })
    }, { description: 'A staff category object', ...options });

    export const CreateStaffMember = t.Object({
        uuid: t.String({ error: '$.error.wrongType;;[["field", "uuid"], ["type", "string"]]' }),
        category: t.String({ error: '$.error.wrongType;;[["field", "category"], ["type", "string"]]' }),
        description: t.Optional(t.Nullable(t.String({ error: '$.error.wrongType;;[["field", "description"], ["type", "string"]]' })))
    }, { description: 'A staff member creation object', ...options });

    export const EditStaffMember = t.Object({
        category: t.Optional(t.String({ error: '$.error.wrongType;;[["field", "category"], ["type", "string"]]' })),
        description: t.Optional(t.Nullable(t.String({ error: '$.error.wrongType;;[["field", "description"], ["type", "string"]]' })))
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
    });

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