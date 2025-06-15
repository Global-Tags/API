import { HydratedDocument, model, Schema } from "mongoose"
import { config } from "../../libs/config";
import { Permission, permissions } from "../../types/Permission";
import { isConnected } from "../mongo";
import Logger from "../../libs/Logger";
import playerSchema from "./players";
import { fetchGuild } from "../../bot/bot";
import players from "./players";

interface IRole {
    name: string,
    position: number,
    hasIcon: boolean,
    sku?: string | null,
    permissions: number,
    getPermissions(): Permission[],
    hasPermission(permission: Permission, ignoreAdmin?: boolean): boolean,
    getSyncedRoles(): string[],
    rename(name: string): Promise<void>
}

export type Role = HydratedDocument<IRole>;
const cachedRoles: Role[] = [];

const schema = new Schema<IRole>({
    name: {
        type: String,
        required: true
    },
    position: {
        type: Number,
        required: true
    },
    hasIcon: {
        type: Boolean,
        required: true
    },
    sku: {
        type: String,
        required: false
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

const roleModel = model<IRole>('roles', schema);

export function getCachedRoles(): Role[] {
    return cachedRoles;
}

const defaultRoles = [
    {
        name: 'admin',
        position: 0,
        hasIcon: false,
        sku: null,
        permissions: 0
    }
]

export async function updateRoleCache(): Promise<void> {
    if(!isConnected()) return;
    cachedRoles.length = 0;
    let roles = await roleModel.find();
    if(roles.length == 0) {
        cachedRoles.push(...await roleModel.insertMany(defaultRoles));
    }

    for(const role of roles) {
        cachedRoles.push(role);
    }
    cachedRoles.sort((a, b) => a.position - b.position);
    Logger.debug('Updated role cache.');
}

export async function getNextPosition(): Promise<number> {
    if(!isConnected()) return -1;
    const roles = await roleModel.find();
    roles.sort((a, b) => a.position - b.position);
    return roles[roles.length - 1].position + 1;
}

export async function synchronizeRoles() {
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

export default roleModel;