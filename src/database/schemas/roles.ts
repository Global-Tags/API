import { HydratedDocument, model, Schema } from "mongoose"
import { config } from "../../libs/config";
import { pascalCase } from "change-case";
import { Permission } from "../../types/Permission";
import { isConnected } from "../mongo";
import Logger from "../../libs/Logger";
import playerSchema from "./players";
import { fetchGuild } from "../../bot/bot";
import players from "./players";

interface IRole {
    name: string,
    position: number,
    hasIcon: boolean,
    permissions: string[],
    getPermissions(): Permission[],
    hasPermission(permission: Permission): boolean,
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
    permissions: {
        type: [String],
        required: true
    }
}, {
    methods: {
        getPermissions(): Permission[] {
            return this.permissions
                .filter((permission) => pascalCase(permission) in Permission)
                .map((permission) => Permission[pascalCase(permission) as keyof typeof Permission]);
        },

        hasPermission(permission: Permission): boolean {
            return this.getPermissions().includes(permission);
        },

        getSyncedRoles(): string[] {
            return config.discordBot.syncedRoles.getRoles(this.name);
        },

        async rename(name: string): Promise<void> {
            const oldName = this.name;
            this.name = name;
            this.save();
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

const syncReason = 'Discord role sync';

export async function synchronizeRoles() {
    if(!isConnected()) return;
    const players = await playerSchema.find({ 'connections.discord.id': { $exists: true } });
    const guild = await fetchGuild();
    const roles = getCachedRoles();

    for(const player of players) {
        const member = await guild.members.fetch(player.connections.discord.id!).catch(() => null);
        if(!member || !member.id) continue;
        let save = false;
        const playerRoles = player.roles
            .filter((role) => !role.expires_at || role.expires_at.getTime() > Date.now());

        for(const role of roles) {
            if(role.getSyncedRoles().length == 0) continue;
            const hasRole = role.getSyncedRoles().some((role) => member.roles.cache.has(role));

            if(hasRole) {
                const playerRole = player.roles.find((r) => r.name == role.name);
                if(!playerRole) {
                    player.roles.push({
                        name: role.name,
                        added_at: new Date(),
                        reason: syncReason,
                        manually_added: false
                    });
                    save = true;
                } else if(playerRole.expires_at && playerRole.expires_at.getTime() < Date.now()) {
                    playerRole.expires_at = null;
                    playerRole.added_at = new Date();
                    playerRole.expires_at = null;
                    playerRole.reason = syncReason;
                    playerRole.manually_added = false;
                    save = true;
                }
            } else {
                const playerRole = playerRoles.find((r) => r.name == role.name);
                if(!playerRole || playerRole.manually_added) continue;
                playerRole.expires_at = new Date();
                save = true;
            }
        }
        if(save) {
            Logger.debug(`Synced roles for ${player.uuid} (${member.id}).`);
            player.save();
        }
    }
}

export default roleModel;