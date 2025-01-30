import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ModLogType, sendModLogMessage } from "../libs/discord-notifier";
import roles, { getCachedRoles, getNextPosition, updateRoleCache } from "../database/schemas/roles";
import { snakeCase } from "change-case";
import { getProfileByUUID } from "../libs/game-profiles";
import { ElysiaApp } from "..";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, error }) => { // Get roles
    if(!session?.hasPermission(Permission.ManageRoles)) return error(403, { error: i18n('error.notAllowed') });

    return getCachedRoles().map((role) => ({
        name: role.name,
        position: role.position,
        hasIcon: role.hasIcon,
        permissions: role.getPermissions().map((permission) => snakeCase(Permission[permission]))
    }));
}, {
    detail: {
        tags: ['Roles'],
        description: 'Returns all roles'
    },
    response: {
        200: t.Array(t.Object({ name: t.String(), position: t.Integer(), hasIcon: t.Boolean(), permissions: t.Array(t.String()) }), { description: 'An array of all roles' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).get('/:name', async ({ session, params, i18n, error }) => { // Get specific role
    if(!session?.hasPermission(Permission.ManageRoles)) return error(403, { error: i18n('error.notAllowed') });
    const name = snakeCase(decodeURIComponent(params.name).trim());

    const role = getCachedRoles().find((role) => role.name == name);
    if(!role) return error(404, { error: i18n('roles.not_found') });

    return {
        name: role.name,
        position: role.position,
        hasIcon: role.hasIcon,
        permissions: role.getPermissions().map((permission) => snakeCase(Permission[permission]))
    };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Returns role data of a specific role'
    },
    response: {
        200: t.Object({ name: t.String(), position: t.Integer(), hasIcon: t.Boolean(), permissions: t.Array(t.String()) }, { description: 'The role info' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        404: t.Object({ error: t.String() }, { description: 'There is no role with the name you provided' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ name: t.String({ description: 'The role name' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).post('/', async ({ session, body, i18n, error }) => { // Create role
    if(!session?.hasPermission(Permission.ManageRoles)) return error(403, { error: i18n('error.notAllowed') });

    const name = snakeCase(body.name.trim());
    if(getCachedRoles().find((role) => role.name == name)) return error(409, { error: i18n('roles.create.already_exists').replaceAll('<role>', name) });

    await roles.insertMany([{
        name,
        position: await getNextPosition(),
        hasIcon: false,
        permissions: []
    }]);
    updateRoleCache();

    sendModLogMessage({
        logType: ModLogType.CreateRole,
        staff: await getProfileByUUID(session.uuid!),
        discord: false,
        role: name
    });

    return { message: i18n('roles.create.success') };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Creates a new role'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The role was created successfully' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        409: t.Object({ error: t.String() }, { description: 'A role with the provided name already exists' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    body: t.Object({ name: t.String({ error: 'error.wrongType;;[["field", "name"], ["type", "string"]]' }) }, { error: 'error.invalidBody', additionalProperties: true }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
}).delete('/:name', async ({ session, params, i18n, error }) => { // Delete role
    if(!session?.hasPermission(Permission.ManageRoles)) return error(403, { error: i18n('error.notAllowed') });

    const name = snakeCase(decodeURIComponent(params.name).trim());

    const role = getCachedRoles().find((role) => role.name == name);
    if(!role) return error(404, { error: i18n('roles.not_found') });

    sendModLogMessage({
        logType: ModLogType.DeleteRole,
        staff: await getProfileByUUID(session.uuid!),
        discord: false,
        role: role.name
    });

    await role.deleteOne();
    updateRoleCache();

    return { message: i18n('roles.delete.success') };
}, {
    detail: {
        tags: ['Roles'],
        description: 'Deletes a specific role'
    },
    response: {
        200: t.Object({ message: t.String() }, { description: 'The role was deleted successfully' }),
        403: t.Object({ error: t.String() }, { description: 'You\'re not allowed to manage roles' }),
        404: t.Object({ error: t.String() }, { description: 'There is no role with the name you provided' }),
        422: t.Object({ error: t.String() }, { description: 'You\'re lacking the validation requirements' }),
        429: t.Object({ error: t.String() }, { description: 'You\'re ratelimited' }),
        503: t.Object({ error: t.String() }, { description: 'The database is not reachable' })
    },
    params: t.Object({ name: t.String({ description: 'The role name' }) }),
    headers: t.Object({ authorization: t.String({ error: 'error.notAllowed', description: 'Your authentication token' }) }, { error: 'error.notAllowed' })
});