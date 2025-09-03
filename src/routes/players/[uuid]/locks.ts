import { t } from "elysia";
import { ElysiaApp } from "../../..";
import { AccountLockType, Player } from "../../../database/schemas/Player";
import { formatUUID, stripUUID } from "../../../libs/game-profiles";
import { DocumentationCategory } from "../../../types/DocumentationCategory";
import { Permission } from "../../../types/Permission";
import { tHeaders, tParams, tRequestBody, tResponseBody, tSchema } from "../../../libs/models";

const lockTypes = Object.values(AccountLockType);

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get all player locks
    if(!session?.player?.hasPermission(Permission.ViewLocks)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.locks.map((lock) => ({
        id: lock.id,
        type: lock.type,
        reason: lock.reason,
        staff: formatUUID(lock.staff),
        locked_at: lock.locked_at.getTime(),
        expires_at: lock.expires_at?.getTime() || null,
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Locks],
        description: 'Get all player locks'
    },
    response: {
        200: t.Array(tSchema.Lock, { description: 'A lock list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
}).get('/:id', async ({ session, params, i18n, status }) => { // Get a specific player lock
    if(!session?.player?.hasPermission(Permission.ViewLocks)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const lock = player.locks.find(({ id }) => id === params.id);
    if(!lock) return status(404, { error: i18n('$.locks.not_found') });
    const { id, type, reason, staff, locked_at, expires_at } = lock;

    return {
        id,
        type,
        reason,
        staff: formatUUID(staff),
        locked_at: locked_at.getTime(),
        expires_at: expires_at?.getTime() || null,
    };
}, {
    detail: {
        tags: [DocumentationCategory.Locks],
        description: 'Get a specific player lock'
    },
    response: {
        200: tSchema.Lock,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndLockId,
    headers: tHeaders
}).post('/', async ({ session, body: { type, reason, duration }, params, i18n, status }) => { // Create player lock
    if(!session?.player?.hasPermission(Permission.ManageLocks)) return status(403, { error: i18n('$.error.notAllowed') });
    
    const lockType = type.toLowerCase() as AccountLockType;
    if(!lockTypes.includes(lockType)) return status(400, { error: i18n('$.locks.invalid_type') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });
    if(player.hasLock(type)) return status(409, { error: i18n('$.locks.already_exists') });

    const expires = duration ? new Date(Date.now() + duration) : null;
    const lock = player.createLock({ type, reason: reason.trim(), staff: session.uuid!, expiresAt: expires })!;
    await player.save();

    // TODO: Send mod log message

    return {
        id: lock.id,
        type: lock.type,
        reason: lock.reason,
        staff: formatUUID(lock.staff),
        locked_at: lock.locked_at.getTime(),
        expires_at: lock.expires_at?.getTime() || null,
    };
}, {
    detail: {
        tags: [DocumentationCategory.Locks],
        description: 'Create a player lock'
    },
    response: {
        200: tSchema.Lock,
        400: tResponseBody.Error,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error
    },
    body: tRequestBody.CreateLock,
    params: tParams.uuid,
    headers: tHeaders
}).patch('/:id', async ({ session, body: { reason }, params, i18n, status }) => { // Update lock info
    if(!session?.player?.hasPermission(Permission.ManageLocks)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const lock = player.locks.find(({ id }) => id === params.id);
    if(!lock) return status(404, { error: i18n('$.locks.not_found') });

    reason = reason?.trim();

    if(reason !== undefined && lock.reason != reason) {
        lock.reason = reason;
        // TODO: Send mod log message
        await player.save();
    }

    return {
        id: lock.id,
        type: lock.type,
        reason: lock.reason,
        staff: formatUUID(lock.staff),
        locked_at: lock.locked_at.getTime(),
        expires_at: lock.expires_at?.getTime() || null
    };
}, {
    detail: {
        tags: [DocumentationCategory.Locks],
        description: 'Edit an existing player lock'
    },
    response: {
        200: tSchema.Lock,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    body: tRequestBody.EditLock,
    params: tParams.uuid,
    headers: tHeaders
}).delete('/:id', async ({ session, params, i18n, status }) => { // Remove a player lock
    if(!session?.player?.hasPermission(Permission.ManageLocks)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const lock = player.locks.find(({ id }) => id === params.id);
    if(!lock) return status(404, { error: i18n('$.locks.not_found') });

    lock.expires_at = new Date();
    await player.save();

    // TODO: Add mod log message

    return { message: i18n('$.locks.removed') };
}, {
    detail: {
        tags: [DocumentationCategory.Locks],
        description: 'Remove a player lock'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        409: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
});