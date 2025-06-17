import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ModLogType, sendModLogMessage } from "../libs/discord-notifier";
import roles, { getCachedRoles, getNextPosition, updateRoleCache } from "../database/schemas/roles";
import { ElysiaApp } from "..";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, status }) => { // Get roles
    if(!session?.player?.hasPermission(Permission.ViewRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    return getCachedRoles().map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color || null,
        hasIcon: role.hasIcon,
        permissions: role.permissions
    }));
}, {
    detail: {
        tags: ['Roles'],
        description: 'Get all roles'
    },
    response: {
        200: t.Array(t.Object({ id: t.String(), name: t.String(), position: t.Integer(), hasIcon: t.Boolean(), color: t.Nullable(t.String()), permissions: t.Number() }), { description: 'The role list' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).get('/:id', async ({ session, params: { id }, i18n, status }) => { // Get specific role
    if(!session?.player?.hasPermission(Permission.ViewRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = getCachedRoles().find((role) => role.id == id);
    if(!role) return status(404, { error: i18n('$.roles.not_found') });

    return {
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color || null,
        hasIcon: role.hasIcon,
        permissions: role.permissions
    };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Get a specific role'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), position: t.Integer(), hasIcon: t.Boolean(), color: t.Nullable(t.String()), permissions: t.Number() }, { description: 'The role data' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        404: t.Object({ error: t.String() }, { description: 'There is no role with the name you provided' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ id: t.String({ description: 'The role ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).post('/', async ({ session, body, i18n, status }) => { // Create role
    if(!session?.player?.hasPermission(Permission.CreateRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await roles.insertOne({
        name: body.name.trim(),
        position: await getNextPosition(),
        hasIcon: false,
        permissions: body.permissions || 0
    });
    updateRoleCache();

    sendModLogMessage({
        logType: ModLogType.CreateRole,
        staff: await session.player.getGameProfile(),
        discord: false,
        role
    });

    return {
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color || null,
        hasIcon: role.hasIcon,
        permissions: role.permissions
    };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Create a new role'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), position: t.Integer(), hasIcon: t.Boolean(), color: t.Nullable(t.String()), permissions: t.Number() }, { description: 'The created role' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        409: t.Object({ error: t.String() }, { description: 'A role with the provided name already exists' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' }), color: t.Optional(t.Nullable(t.String({ minLength: 6, maxLength: 6, error: '$.error.wrongType;;[["field", "color"], ["type", "string"]]' }))), permissions: t.Optional(t.Integer({ error: '$.error.wrongType;;[["field", "permissions"], ["type", "integer"]]' })) }, { error: '$.error.invalidBody', additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}).patch('/:id', async ({ session, params, body: { name, color, permissions }, i18n, status }) => { // Edit role
    if(!session?.player?.hasPermission(Permission.DeleteRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await roles.findOne({ id: params.id });
    if(!role) return status(404, { error: i18n('$.roles.not_found') });

    let updated = false;
    if(name && name.trim() !== role.name) {
        role.name = name.trim();
        updated = true;
    }
    if(color && color !== role.color) {
        role.color = color;
        updated = true;
    }
    if(permissions !== undefined && permissions !== role.permissions) {
        if(permissions < 0 || permissions > 2147483647) return status(422, { error: i18n('$.error.invalid_bitfield') });
        role.permissions = permissions;
        updated = true;
    }

    if(updated) {
        await role.save();
        updateRoleCache();
    
        // sendModLogMessage({ // TODO: Add mod log for role edit
        //     logType: ModLogType.DeleteRole,
        //     staff: await session.player.getGameProfile(),
        //     discord: false,
        //     role
        // });
    }

    return {
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color || null,
        hasIcon: role.hasIcon,
        permissions: role.permissions
    };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Edit a role'
    },
    response: {
        200: t.Object({ id: t.String(), name: t.String(), position: t.Integer(), hasIcon: t.Boolean(), color: t.Nullable(t.String()), permissions: t.Number() }, { description: 'The edited role' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        404: t.Object({ error: t.String() }, { description: 'There is no role with the name you provided' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.Optional(t.String({ error: '$.error.wrongType;;[["field", "name"], ["type", "string"]]' })), color: t.Optional(t.Nullable(t.String({ minLength: 6, maxLength: 6, error: '$.error.wrongType;;[["field", "color"], ["type", "string"]]' }))), permissions: t.Optional(t.Integer({ error: '$.error.wrongType;;[["field", "permissions"], ["type", "integer"]]' })) }, { error: '$.error.invalidBody', additionalProperties: true }),
    params: t.Object({ id: t.String({ description: 'The role ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
}) // TODO: Implement route to patch all roles at once
.delete('/:id', async ({ session, params, i18n, status }) => { // Delete role
    if(!session?.player?.hasPermission(Permission.DeleteRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await roles.findOne({ id: params.id });
    if(!role) return status(404, { error: i18n('$.roles.not_found') });

    sendModLogMessage({
        logType: ModLogType.DeleteRole,
        staff: await session.player.getGameProfile(),
        discord: false,
        role
    });

    await role.deleteOne();
    updateRoleCache();

    return { message: i18n('$.roles.delete.success') };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Delete a role'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The success message' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        404: t.Object({ error: t.String() }, { description: 'There is no role with the name you provided' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ id: t.String({ description: 'The role ID' }) }),
    headers: t.Object({ authorization: t.String({ error: '$.error.notAllowed', description: 'Your authentication token' }) }, { error: '$.error.notAllowed' })
});