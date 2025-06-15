import { t } from "elysia";
import players from "../../../database/schemas/players";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { Permission } from "../../../types/Permission";
import { GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { snakeCase } from "change-case";
import { generateSecureCode } from "../../../libs/crypto";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get api key list
    if(!session?.hasPermission(Permission.ManageApiKeys)) return status(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('error.playerNotFound') });

    return player.api_keys.map((key) => ({
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null,
        name: key.name
    }));
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns all player API keys'
    },
    response: {
        200: t.Array(t.Object({ created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]), name: t.String() }), { description: 'A list of API keys' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).get('/:name', async ({ session, params, i18n, status }) => { // Get info of specific api key
    if(!session?.hasPermission(Permission.ManageApiKeys)) return status(403, { error: i18n('error.notAllowed') });

    const player = await players.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('error.playerNotFound') });
    
    const key = player.api_keys.find(({ name }) => name === params.name);
    if(!key) return status(404, { error: i18n('api_keys.not_found') });
    const { created_at, last_used, name } = key;

    return { created_at: created_at.getTime(), last_used: last_used?.getTime() || null, name };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Returns info about a specific API key'
    },
    response: {
        200: t.Object({ created_at: t.Number(), last_used: t.Union([t.Number(), t.Null()]), name: t.String() }, { description: 'The API key info' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or API key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), name: t.String({ description: 'The API key name' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/', async ({ session, body: { name }, params, i18n, status }) => { // Create an API key
    if(!session?.hasPermission(Permission.ManageApiKeys)) return status(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return status(404, { error: i18n('error.playerNotFound') });
    if(player.api_keys.find((key) => key.name.toLowerCase() == name.toLowerCase())) return status(409, { error: i18n('api_keys.already_exists') });
    name = snakeCase(name.trim());

    const key = player.createApiKey(name);
    await player.save();

    sendModLogMessage({
        logType: ModLogType.CreateApiKey,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await player.getGameProfile(),
        discord: false,
        key: name
    });

    return { message: i18n('api_keys.created'), name, key };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Creates an API key'
    },
    response: {
        200: t.Object({ message: t.String(), name: t.String(), key: t.String() }, { description: 'The API key was created' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player was not found' }),
        409: t.Object({ error: t.String() }, { description: 'An API key with this name already exists' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: 'error.wrongType;;[["field", "name"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).patch('/:name', async ({ session, params, i18n, status }) => { // Regenerate API key
    if(!session?.hasPermission(Permission.ManageApiKeys)) return status(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return status(404, { error: i18n('error.playerNotFound') });
    const key = player.api_keys.find((key) => key.name.toLowerCase() == params.name.toLowerCase());
    if(!key) return status(404, { error: i18n('api_keys.not_found') });

    key.key = `sk_${generateSecureCode(32)}`;
    await player.save();

    sendModLogMessage({
        logType: ModLogType.RegenerateApiKey,
        user: await player.getGameProfile(),
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        discord: false,
        key: key.name
    });

    return { message: i18n('api_keys.regenerated'), key: key.key };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Regenerates an existing API key'
    },
    response: {
        200: t.Object({ message: t.String(), key: t.String() }, { description: 'The key was regenerated' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), name: t.String({ description: 'The API key name' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/:name', async ({ session, params, i18n, status }) => { // Delete api key
    if(!session?.hasPermission(Permission.ManageApiKeys)) return status(403, { error: i18n('error.notAllowed') });
    const uuid = stripUUID(params.uuid);

    const player = await players.findOne({ uuid });
    if(!player) return status(404, { error: i18n('error.playerNotFound') });
    const key = player.api_keys.find((key) => key.name.toLowerCase() == params.name.toLowerCase());
    if(!key) return status(404, { error: i18n('api_keys.not_found') });

    player.api_keys = player.api_keys.filter((k) => k.name != key.name);
    await player.save();

    sendModLogMessage({
        logType: ModLogType.DeleteApiKey,
        staff: await GameProfile.getProfileByUUID(session.uuid!),
        user: await player.getGameProfile(),
        discord: false,
        key: key.name
    });

    return { message: i18n('api_keys.deleted') };
}, {
    detail: {
        tags: ['Admin'],
        description: 'Deletes an API key'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The key was deleted' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage API keys' }),
        404: t.Object({ error: t.String() }, { description: 'The player or key was not found' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ uuid: t.String({ description: 'The player\'s UUID' }), name: t.String({ description: 'The API key name' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});