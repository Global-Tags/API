import { t } from "elysia";
import { Permission } from "../../../types/Permission";
import { stripUUID } from "../../../libs/game-profiles";
import { ElysiaApp } from "../../..";
import { Player, PlayerDocument } from "../../../libs/database/schemas/Player";
import { tResponseBody, tHeaders, tParams, tRequestBody, tSchema } from "../../../libs/models";
import { DocumentationCategory } from "../../../types/DocumentationCategory";

export default (app: ElysiaApp) => app.get('/', async ({ session, params, i18n, status }) => { // Get roles
    if(!session?.player?.hasPermission(Permission.ManagePlayerRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    return player.roles.map((role) => ({
        id: role.id,
        reason: role.reason,
        visible: role.visible,
        added_at: role.added_at.getTime(),
        expires_at: role.expires_at?.getTime() ?? null,
        conditions: role.conditions
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Get all player roles'
    },
    response: {
        200: t.Array(tSchema.PlayerRole, { description: 'A role list' }),
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuid,
    headers: tHeaders
}).get('/:id', async ({ session, params: { uuid, id }, i18n, status }) => { // Get specific role
    if(!session?.player?.hasPermission(Permission.ManagePlayerRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(uuid) }).lean();
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const role = player.roles.find((role) => role.id === id);
    if(!role) return status(404, { error: i18n('$.roles.delete.not_found') });

    return {
        id: role.id,
        reason: role.reason,
        visible: role.visible,
        added_at: role.added_at.getTime(),
        expires_at: role.expires_at?.getTime() ?? null,
        conditions: role.conditions
    };
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Get a specific player role'
    },
    response: {
        200: tSchema.PlayerRole,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndRoleId,
    headers: tHeaders
}).post('/', async ({ session, body: { role: roleId, reason, visible, expires_at }, params, i18n, status }) => { // Add role to player
    if(!session?.player?.hasPermission(Permission.ManagePlayerRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(params.uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const executor = session.player;
    if(isAllowedToModifyRole(executor, player)) return status(403, { error: i18n('$.roles.add.not_allowed') });

    const role = player.addRole({
        reason: `${(await executor.getGameProfile()).getUsernameOrUUID()}: ${reason.trim()}`,
        id: roleId,
        visible: visible ?? true,
        expiresAt: expires_at ? new Date(expires_at) : null
    });
    if(!role.success) return status(400, { error: i18n('$.roles.add.role_already_added') });
    await player.save();
    
    // TODO: add log

    return player.roles.map((role) => ({
        id: role.id,
        reason: role.reason,
        visible: role.visible,
        added_at: role.added_at.getTime(),
        expires_at: role.expires_at?.getTime() ?? null,
        conditions: role.conditions
    }));
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Add a role to a player'
    },
    response: {
        201: t.Array(tSchema.PlayerRole, { description: 'A role list' }),
        400: tResponseBody.Error,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    body: tRequestBody.AddPlayerRole,
    params: tParams.uuid,
    headers: tHeaders
}).patch('/:id', async ({ session, body: { reason, visible, expires_at }, params: { uuid, id }, i18n, status }) => { // Update role
    if(!session?.selfOrHasPermission(Permission.ManagePlayerRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const executor = session.player;
    if(!session.self && executor && isAllowedToModifyRole(executor, player)) return status(403, { error: i18n('$.roles.edit.not_allowed') });

    const role = player.roles.find((r) => r.id === id);
    if(!role) return status(404, { error: i18n('$.roles.update.not_found') });
    const elevatedPermissions = session.player?.hasPermission(Permission.ManagePlayerRoles) || false;

    if(elevatedPermissions) {
        reason &&= reason.trim();
        if(reason !== undefined) role.reason = reason;
        if(expires_at !== undefined) role.expires_at = expires_at ? new Date(expires_at) : null;
    }
    if(visible !== undefined) role.visible = visible;

    player.markModified('roles');
    await player.save();

    return {
        id: role.id,
        reason: role.reason,
        visible: role.visible,
        added_at: role.added_at.getTime(),
        expires_at: role.expires_at?.getTime() ?? null,
        conditions: role.conditions
    };
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Update a player role'
    },
    response: {
        200: tSchema.PlayerRole,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    body: tRequestBody.EditPlayerRole,
    params: tParams.uuidAndRoleId,
    headers: tHeaders
}).delete('/:id', async ({ session, params: { uuid, id }, i18n, status }) => { // Remove role from player
    if(!session?.player?.hasPermission(Permission.ManagePlayerRoles)) return status(403, { error: i18n('$.error.notAllowed') });

    const player = await Player.findOne({ uuid: stripUUID(uuid) });
    if(!player) return status(404, { error: i18n('$.error.playerNotFound') });

    const executor = session.player;
    if(isAllowedToModifyRole(executor, player)) return status(403, { error: i18n('$.roles.remove.not_allowed') });

    const role = player.roles.find((r) => r.id === id);
    if(!role) return status(404, { error: i18n('$.roles.delete.not_found') });

    if(!player.removeRole(role.id)) return status(400, { error: i18n('$.roles.remove.not_added') });
    await player.save();

    // TODO: add log

    return { message: i18n('$.roles.remove.success') };
}, {
    detail: {
        tags: [DocumentationCategory.Roles],
        description: 'Remove a specific player role'
    },
    response: {
        200: tResponseBody.Message,
        400: tResponseBody.Error,
        403: tResponseBody.Error,
        404: tResponseBody.Error,
    },
    params: tParams.uuidAndRoleId,
    headers: tHeaders
});

function isAllowedToModifyRole(executor: PlayerDocument, player: PlayerDocument): boolean {
    const playerRolePosition = player.getActiveRoles().sort((a, b) => b.role.position - a.role.position)[0]?.role.position;
    const executorRolePosition = executor.getActiveRoles().sort((a, b) => b.role.position - a.role.position)[0]?.role.position;

    return !playerRolePosition
        || !executorRolePosition
        || executorRolePosition === 0 // bypass position check if executor has the highest possible role
        || playerRolePosition > executorRolePosition; // lower position means higher role
}