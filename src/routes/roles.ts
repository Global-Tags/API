import { t } from "elysia";
import { Permission } from "../types/Permission";
import { ModLogType, sendModLogMessage } from "../libs/discord-notifier";
import { getCachedRoles, getNextPosition, Role, updateRoleCache } from "../libs/database/schemas/Role";
import { ElysiaApp } from "..";
import { tHeaders, tParams, tRequestBody, tResponseBody, tSchema } from "../libs/models";
import { DocumentationCategory } from "../types/DocumentationCategory";
import { snakeCase } from "change-case";
import Logger from "../libs/Logger";
import { config } from "../libs/config";
import { roleIconFile } from "../libs/data-accessor";
import { imageErrorTranslation, processUploadedImage } from "../libs/image-processor";

export default (app: ElysiaApp) => app.get('/', async ({ session, i18n, status }) => { // Get roles
    if(!session?.player?.hasPermission(Permission.ViewRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    return getCachedRoles().sort((a, b) => a.position - b.position).map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color,
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
        color: role.color,
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

    const name = body.name.trim();
    const permissions = body.permissions ?? 0;
    const color = body.color || null;

    if(permissions < 0 || permissions > 2147483647) return status(422, { error: i18n('$.error.invalid_bitfield') });

    const role = await Role.insertOne({
        id: snakeCase(name),
        name,
        position: await getNextPosition(),
        color,
        permissions
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
        403: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.CreateRole,
    headers: tHeaders
}).get('/:id/icon', async ({ session, params, i18n, status }) => { // Get role icon
    if(!session?.player?.hasPermission(Permission.EditRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.findOne({ id: params.id });
    if(!role) return status(404, { error: i18n('$.roles.not_found') });
    if(!role.hasIcon) return status(404, { error: i18n('$.roles.icon_not_found') });
    
    const file = roleIconFile(role.id);
    if(!(await file.exists())) return status(404, { error: i18n('$.roles.icon_not_found') });

    return file as File;
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Get a role icon',
    },
    response: {
        200: t.File({ description: 'The role icon file' }),
        404: tResponseBody.Error,
        403: tResponseBody.Error,
        422: tResponseBody.Error
    },
    headers: tHeaders
}).post('/:id/icon', async ({ session, params, body, i18n, status }) => { // Set role icon
    if(!session?.player?.hasPermission(Permission.EditRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.findOne({ id: params.id });
    if(!role) return status(404, { error: i18n('$.roles.not_found') });

    role.hasIcon = true;
    role.markModified('hasIcon');

    try {
        await processUploadedImage(
            new Bun.Image(await body.image.arrayBuffer()),
            config.validation.icon.maxResolution,
            roleIconFile(role.id)
        );
        await role.save();
        updateRoleCache();

        return {
            id: role.id,
            name: role.name,
            position: role.position,
            color: role.color || null,
            hasIcon: role.hasIcon,
            permissions: role.permissions
        };
    } catch(err) {
        return status(422, { error: i18n(imageErrorTranslation(err)) });
    }
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Upload a role icon',
    },
    response: {
        200: tSchema.Role,
        404: tResponseBody.Error,
        403: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.UploadRoleIcon,
    headers: tHeaders
}).delete('/:id/icon', async ({ session, params, i18n, status }) => { // Delete role icon
    if(!session?.player?.hasPermission(Permission.EditRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.findOne({ id: params.id });
    if(!role) return status(404, { error: i18n('$.roles.not_found') });
    if(!role.hasIcon) return status(404, { error: i18n('$.roles.icon_not_found') });

    await roleIconFile(role.id).delete();
    role.hasIcon = false;
    role.markModified('hasIcon');
    await role.save();
    updateRoleCache();

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
        description: 'Delete a role icon',
    },
    response: {
        200: tSchema.Role,
        404: tResponseBody.Error,
        403: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.UploadRoleIcon,
    headers: tHeaders
}).patch('/:id', async ({ session, params, body: { name, color, permissions }, i18n, status }) => { // Edit role
    if(!session?.player?.hasPermission(Permission.EditRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const role = await Role.findOne({ id: params.id });
    if(!role) return status(404, { error: i18n('$.roles.not_found') });

    name &&= name.trim();
    if(name && name !== role.name) {
        role.name = name;
        role.markModified('name');
    }
    if(color && color !== role.color) {
        role.color = color;
        role.markModified('color');
    }
    if(permissions !== undefined && permissions !== role.permissions) {
        if(permissions < 0 || permissions > 2147483647) return status(422, { error: i18n('$.error.invalid_bitfield') });
        role.permissions = permissions;
        role.markModified('permissions');
    }

    if(role.isModified()) {
        await role.save();
        updateRoleCache();

        // TODO: notification
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
        422: tResponseBody.Error
    },
    body: tRequestBody.EditRole,
    params: tParams.roleId,
    headers: tHeaders
}).patch('/', async ({ session, body, i18n, status }) => { // Reorder role positions
    if(!session?.player?.hasPermission(Permission.EditRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const roles = getCachedRoles();
    if(roles.length !== body.length) return status(422, { error: i18n('$.roles.reorder.invalid_length') });
    const unknownRole = roles.find((role) => !body.includes(role.id));
    if(unknownRole) return status(422, { error: i18n('$.roles.reorder.unknown_role').replace('{role}', unknownRole.name) });

    for(const role of roles) {
        const newPosition = body.indexOf(role.id);
        if(role.position !== newPosition) {
            await Role.updateOne({ id: role.id }, { position: newPosition });
            Logger.debug(`Updated position of role "${role.id}" to ${newPosition}.`);
        }
    }
    updateRoleCache();

    return { message: i18n('$.roles.reorder.success') };
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Reorder role positions'
    },
    response: {
        200: tResponseBody.Message,
        403: tResponseBody.Error,
        422: tResponseBody.Error
    },
    body: tRequestBody.ReorderRoles,
    headers: tHeaders
}).delete('/:id', async ({ session, params, i18n, status }) => { // Delete role
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