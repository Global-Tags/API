import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ModLogType, sendModLogMessage } from "../libs/discord-notifier";
import { getCachedRoles, getNextPosition, Role, updateRoleCache } from "../database/schemas/Role";
import { ElysiaApp } from "..";
import { tHeaders, tParams, tRequestBody, tResponseBody, tSchema } from "../libs/models";
import { DocumentationCategory } from "../types/DocumentationCategory";

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
        tags: [DocumentationCategory.Roles],
        description: 'Get all roles'
    },
    response: {
        200: t.Array(tSchema.Role, { description: 'A role list' }),
        403: tResponseBody.Error
    },
    headers: tHeaders
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
        tags: [DocumentationCategory.Roles],
        description: 'Get a specific role'
    },
    response: {
        200: tSchema.Role,
        403: tResponseBody.Error,
        404: tResponseBody.Error
    },
    params: tParams.roleId,
    headers: tHeaders
}).post('/', async ({ session, body, i18n, status }) => { // Create role
    if(!session?.player?.hasPermission(Permission.CreateRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.insertOne({
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
        tags: [DocumentationCategory.Roles],
        description: 'Create a new role',
    },
    response: {
        200: tSchema.Role,
        403: tResponseBody.Error
    },
    body: tRequestBody.Role,
    headers: tHeaders
}).patch('/:id', async ({ session, params, body: { name, color, permissions }, i18n, status }) => { // Edit role
    if(!session?.player?.hasPermission(Permission.DeleteRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.findOne({ id: params.id });
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
        tags: [DocumentationCategory.Roles],
        description: 'Edit a role'
    },
    response: {
        200: tSchema.Role,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
        422: tResponseBody.Error,
    },
    body: tRequestBody.Role,
    params: tParams.roleId,
    headers: tHeaders
}) // TODO: Implement route to patch all roles at once
.delete('/:id', async ({ session, params, i18n, status }) => { // Delete role
    if(!session?.player?.hasPermission(Permission.DeleteRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.findOne({ id: params.id });
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
        tags: [DocumentationCategory.Roles],
        description: 'Delete a role'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.roleId,
    headers: tHeaders
});