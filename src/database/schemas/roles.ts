import { HydratedDocument, model, Schema } from "mongoose"
import { config } from "../../libs/config";
import { pascalCase } from "change-case";
import { Permission } from "../../types/Permission";
import { isConnected } from "../mongo";
import Logger from "../../libs/Logger";

interface IRole {
    name: string,
    position: number,
    hasIcon: boolean,
    permissions: string[],
    getPermissions(): Permission[],
    hasPermission(permission: Permission): boolean,
    getSyncedRoles(): string[]
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
    permissions: {
        type: [String],
        required: true
    }
}, {
    methods: {
        getPermissions() {
            return this.permissions
                .filter((permission) => pascalCase(permission) in Permission)
                .map((permission) => Permission[pascalCase(permission) as keyof typeof Permission]);
        },

        hasPermission(permission: Permission) {
            return this.getPermissions().includes(permission);
        },

        getSyncedRoles() {
            return config.discordBot.syncedRoles.getRoles(this.name);
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
        permissions: [
            'bypass_validation',
            'custom_icon',
            'manage_bans',
            'manage_notes',
            'manage_subscriptions',
            'manage_reports',
            'manage_roles',
            'manage_tags',
            'manage_watchlist',
            'report_immunity'
        ]
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
    cachedRoles.sort();
    Logger.debug('Updated role cache.');
}

export async function getNextPosition(): Promise<number> {
    if(!isConnected()) return -1;
    const roles = await roleModel.find();
    roles.sort((a, b) => a.position - b.position);
    return roles[roles.length - 1].position + 1;
}

export default roleModel;