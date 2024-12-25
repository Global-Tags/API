import roleConfig from "../../config/roles.json";
import { config } from "./Config";

const roles: Role[] = [];

export enum Permission {
    BypassValidation,
    CustomIcon,
    ManageBans,
    ManageNotes,
    ManageSubscriptions,
    ManageRoles,
    ManageTags,
    ManageWatchlist,
    ReportImmunity
}

export class Role {
    name: string
    hasIcon: boolean
    permissions: Permission[]

    constructor(name: string, hasIcon: boolean, permissions: Permission[]) {
        this.name = name;
        this.hasIcon = hasIcon;
        this.permissions = permissions;
    }

    hasPermission(permission: Permission): boolean {
        return this.permissions.includes(permission);
    }

    getSyncedRoles(): string[] {
        return config.discordBot.syncedRoles.getRoles(this);
    }
}

for(const role of roleConfig) {
    const permissions = role.permissions
        .filter((permission) => permission in Permission)
        .map((permission) => Permission[permission as keyof typeof Permission]);

    roles.push(new Role(role.name, role.hasIcon, permissions));
}

export function getRoles(): Role[] {
    return roles;
}

export function getRole(name: string): Role | undefined {
    return roles.find((role) => name.toLowerCase() == role.name.toLowerCase());
}