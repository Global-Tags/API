import roleConfig from "../../config/roles.json";

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
    permissions: Permission[]

    constructor(name: string, permissions: Permission[]) {
        this.name = name;
        this.permissions = permissions;
    }

    hasPermission(permission: Permission) {
        return this.permissions.includes(permission);
    }
}

for(const role of roleConfig) {
    const permissions = role.permissions
        .filter((permission) => permission in Permission)
        .map((permission) => Permission[permission as keyof typeof Permission]);

    roles.push(new Role(role.name, permissions));
}

export function getRoles(): Role[] {
    return roles;
}

export function getRole(name: string): Role | undefined {
    return roles.find((role) => name.toLowerCase() == role.name.toLowerCase());
}