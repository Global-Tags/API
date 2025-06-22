import { HydratedDocument, model, Schema } from "mongoose"
import { config } from "../../libs/config";
import { Permission, permissions } from "../../types/Permission";
import { isConnected } from "../mongo";
import Logger from "../../libs/Logger";
import playerSchema from "./players";
import { fetchGuild } from "../../bot/bot";
import players from "./players";
import { generateSecureCode } from "../../libs/crypto";

const cachedRoles: RoleDocument[] = [];

interface IRole {
    /**
     * Unique identifier for the role
     */
    id: string;
    /**
     * Name of the role
     */
    name: string;
    /**
     * Position of the role in the list
     */
    position: number;
    /**
     * Color of the role in hex format (e.g., 'FF0000' for red)
     * Can be null if no color is set
     */
    color: string | null;
    /**
     * Whether the role has an icon
     */
    hasIcon: boolean,
    /**
     * SKU of the role, used for Discord integration
     * Can be null if not applicable
     * @deprecated
     */
    sku: string | null,
    /**
     * Bitwise representation of permissions assigned to the role
     * @see Permission
     */
    permissions: number,

    /**
     * Retrieves the permissions of the role as an array of Permission enums
     * @returns {Permission[]} Array of permissions
     */
    getPermissions(): Permission[],

    /**
     * Checks if the role has a specific permission
     * @param {Permission} permission - The permission to check
     * @param {boolean} [ignoreAdmin=false] - Whether to ignore the Administrator permission
     * @returns {boolean} True if the role has the permission, false otherwise
     */
    hasPermission(permission: Permission, ignoreAdmin?: boolean): boolean,

    /**
     * Retrieves the list of Discord role IDs that are synced with this role
     * @returns {string[]} Array of Discord role IDs
     */
    getSyncedRoles(): string[],

    /**
     * Renames the role and updates all players with this role. You don't need to save the document after calling this method.
     * @param {string} name - The new name for the role
     * @returns {Promise<void>} A promise that resolves when the role is renamed
     */
    rename(name: string): Promise<void>
}

const RoleSchema = new Schema<IRole>({
    id: {
        type: String,
        required: true,
        unique: true,
        default: generateSecureCode
    },
    name: {
        type: String,
        required: true
    },
    position: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        required: true,
        default: null
    },
    hasIcon: {
        type: Boolean,
        required: true
    },
    sku: {
        type: String,
        required: true,
        default: null
    },
    permissions: {
        type: Number,
        required: true
    }
}, {
    methods: {
        getPermissions(): Permission[] {
            return permissions.filter((permission) => this.hasPermission(permission));
        },

        hasPermission(permission: Permission, ignoreAdmin: boolean = false): boolean {
            return (this.permissions & permission) === permission || (!ignoreAdmin && this.hasPermission(Permission.Administrator, true));
        },

        getSyncedRoles(): string[] {
            return config.discordBot.syncedRoles.getRoles(this.name);
        },

        async rename(name: string): Promise<void> {
            const oldName = this.name;
            this.name = name;
            await this.save();
            await players.updateMany({ 'roles.name': oldName }, { $set: { 'roles.$.name': name } });
            updateRoleCache();
        }
    }
});

export function getCachedRoles(): RoleDocument[] {
    return cachedRoles;
}

const defaultRoles = [
    {
        name: 'admin',
        position: 0,
        hasIcon: false,
        color: 'FF0000',
        sku: null,
        permissions: Permission.Administrator
    }
]

export async function updateRoleCache(): Promise<void> {
    if(!isConnected()) return;
    cachedRoles.length = 0;
    let roles = await Role.find();
    if(roles.length == 0) {
        cachedRoles.push(...await Role.insertMany(defaultRoles));
    }

    for(const role of roles) {
        cachedRoles.push(role);
    }
    cachedRoles.sort((a, b) => a.position - b.position);
    Logger.debug('Updated role cache.');
}

export async function getNextPosition(): Promise<number> {
    if(!isConnected()) return -1;
    const roles = await Role.find();
    roles.sort((a, b) => a.position - b.position);
    return roles[roles.length - 1].position + 1;
}

export async function synchronizeDiscordRoles() {
    if(!isConnected()) return;
    const players = await playerSchema.find({ 'connections.discord.id': { $exists: true } });
    const guild = await fetchGuild();
    const roles = getCachedRoles();

    for(const player of players) {
        const member = await guild.members.fetch(player.connections.discord.id!).catch(() => null);
        if(!member || !member.id) continue;
        const playerRoles = player.getActiveRoles();

        for(const role of roles) {
            if(role.getSyncedRoles().length == 0) continue;

            if(playerRoles.some((playerRole) => playerRole.role.name == role.name)) {
                for(const syncedRole of role.getSyncedRoles()) {
                    if(member.roles.cache.has(syncedRole)) continue;
                    member.roles.add(syncedRole)
                        .then(() => Logger.debug(`Added synced role "${syncedRole}" (${role.name}) to member "${member.id}".`))
                        .catch((error) => Logger.error(`Failed to add synced role "${syncedRole}" (${role.name}) to member "${member.id}": ${error}`));
                }
            } else {
                for(const syncedRole of role.getSyncedRoles()) {
                    if(!member.roles.cache.has(syncedRole)) continue;
                    member.roles.remove(syncedRole)
                        .then(() => Logger.debug(`Removed synced role "${syncedRole}" (${role.name}) from member "${member.id}".`))
                        .catch((error) => Logger.error(`Failed to remove synced role "${syncedRole}" (${role.name}) from member "${member.id}": ${error}`));
                }
            }
        }
    }
}

export const Role = model<IRole>('Role', RoleSchema);
export type RoleDocument = HydratedDocument<IRole>;