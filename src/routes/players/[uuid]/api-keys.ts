import { t } from "elysia";
import players from "../../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { Permission } from "../../../types/Permission";
import { GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { generateSecureCode } from "../../../libs/crypto";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get api key list
    if(!session?.player?.hasPermission(Permission.ViewApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.api_keys.map((key) => ({
        id: key.id,
        name: key.name,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: 'Get all player API keys'
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), name: t.String(), created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]) }), { description: 'The API key list' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).get('/:id', async ({ session, params, i18n, status }) => { // Get info of specific api key
    if(!session?.player?.hasPermission(Permission.ViewApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    
    const key = player.getApiKey(params.id);
    if(!key) return status(404, { error: i18n('$.api_keys.not_found') });
    const { name, id, created_at, last_used } = key;

    return { id, name, created_at: created_at.getTime(), last_used: last_used?.getTime() || null };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Get info about a specific API key'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]) }, { description: 'The API key info' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or API key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The API key ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).post('/', async ({ session, body: { name }, params, i18n, status }) => { // Create an API key
    if(!session?.player?.hasPermission(Permission.CreateApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const key = player.createApiKey(name.trim());
    await player.save();

    sendModLogMessage({
        logType: ModLogType.CreateApiKey,
        staff: await session.player.getGameProfile(),
        user: await player.getGameProfile(),
        discord: false,
        key
    });

    return {
        id: key.id,
        name: key.name,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Create an API key'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]) }, { description: 'The created API key' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'An API key with this name already exists' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).post('/:id/regenerate', async ({ session, params, i18n, status }) => { // Regenerate API key
    if(!session?.player?.hasPermission(Permission.EditApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    const key = player.getApiKey(params.id);
    if(!key) return status(404, { error: i18n('$.api_keys.not_found') });

    key.key = `sk_${generateSecureCode(32)}`;
    await player.save();

    sendModLogMessage({
        logType: ModLogType.RegenerateApiKey,
        user: await player.getGameProfile(),
        staff: await session.player.getGameProfile(),
        discord: false,
        key: key
    });

    return {
        id: key.id,
        name: key.name,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Edit an existing API key'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]) }, { description: 'The regenerated API key' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The API key ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).patch('/:id', async ({ session, params, body: { name }, i18n, status }) => { // Edit API key
    if(!session?.player?.hasPermission(Permission.EditApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const key = player.getApiKey(params.id);
    if(!key) return status(404, { error: i18n('$.api_keys.not_found') });

    key.name = name.trim();
    await player.save();

    // sendModLogMessage({ // TODO: Add own log message
    //     logType: ModLogType.RegenerateApiKey,
    //     user: await player.getGameProfile(),
    //     staff: await session.player.getGameProfile(),
    //     discord: false,
    //     key: key
    // });

    return {
        id: key.id,
        name: key.name,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Regenerate an existing API key'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]) }, { description: 'The edited API Key' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The API key ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).delete('/:id', async ({ session, params, i18n, status }) => { // Delete api key
    if(!session?.player?.hasPermission(Permission.DeleteApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    const key = player.getApiKey(params.id);
    if(!key || !player.deleteApiKey(key.id)) return status(404, { error: i18n('$.api_keys.not_found') });

    await player.save();

    sendModLogMessage({
        logType: ModLogType.DeleteApiKey,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await player.getGameProfile(),
        discord: false,
        key: key
    });

    return { message: i18n('$.api_keys.deleted') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Delete an API key'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The success message' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), id: t.String({ description: 'The API key ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});