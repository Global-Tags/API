import { t } from "elysia";
import { ModLogType, sendModLogMessage } from "../../../libs/discord-notifier";
import { Permission } from "../../../types/Permission";
import { GameProfile, stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { generateSecureCode } from "../../../libs/crypto";
import { Player } from "../../../database/schemas/Player";
import { tHeaders, tParams, tRequestBody, tResponseBody, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get api key list
    if(!session?.player?.hasPermission(Permission.ViewApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.api_keys.map((key) => ({
        id: key.id,
        name: key.name,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    }));
}, {
    detail: {
        tags: [DocumentationCategory.ApiKeys],
        description: 'Get all player API keys'
    },
    response: {
        200: t.Array(tSchema.PublicApiKey, { description: 'An API key list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.uuid,
    headers: tHeaders
}).get('/:id', async ({ session, params, i18n, status }) => { // Get info of specific api key
    if(!session?.player?.hasPermission(Permission.ViewApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    
    const key = player.getApiKey(params.id);
    if(!key) return status(404, { error: i18n('$.api_keys.not_found') });
    const { name, id, created_at, last_used } = key;

    return { id, name, created_at: created_at.getTime(), last_used: last_used?.getTime() || null };
}, {
    detail: {
        tags: [DocumentationCategory.ApiKeys],
        description: 'Get a specific API key'
    },
    response: {
        200: tSchema.PublicApiKey,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.uuidAndApiKeyId,
    headers: tHeaders
}).post('/', async ({ session, body: { name }, params, i18n, status }) => { // Create an API key
    if(!session?.player?.hasPermission(Permission.CreateApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
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
        key: key.key,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    };
}, {
    detail: {
        tags: [DocumentationCategory.ApiKeys],
        description: 'Create an API key'
    },
    response: {
        200: tSchema.PrivateApiKey,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    body: tRequestBody.ApiKey,
    params: tParams.uuid,
    headers: tHeaders
}).post('/:id/regenerate', async ({ session, params, i18n, status }) => { // Regenerate API key
    if(!session?.player?.hasPermission(Permission.EditApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
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
        key: key.key,
        created_at: key.created_at.getTime(),
        last_used: key.last_used?.getTime() || null
    };
}, {
    detail: {
        tags: [DocumentationCategory.ApiKeys],
        description: 'Regenerate an existing API key'
    },
    response: {
        200: tSchema.PrivateApiKey,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndApiKeyId,
    headers: tHeaders
}).patch('/:id', async ({ session, params, body: { name }, i18n, status }) => { // Edit API key
    if(!session?.player?.hasPermission(Permission.EditApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
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
        tags: [DocumentationCategory.ApiKeys],
        description: 'Edit an existing API key'
    },
    response: {
        200: tSchema.PublicApiKey,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    body: tRequestBody.ApiKey,
    params: tParams.uuidAndApiKeyId,
    headers: tHeaders
}).delete('/:id', async ({ session, params, i18n, status }) => { // Delete api key
    if(!session?.player?.hasPermission(Permission.DeleteApiKeys)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
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
        tags: [DocumentationCategory.ApiKeys],
        description: 'Delete an API key'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.uuidAndApiKeyId,
    headers: tHeaders
});