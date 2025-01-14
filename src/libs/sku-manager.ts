import skuConfig from "../../config/skus.json";

const skus: SKU[] = [];

export type SKU = {
    id: string;
    name: string,
    role: string,
    discordRoles: string[]
}

for(const role of skuConfig) {
    skus.push({
        id: role.id,
        name: role.name,
        role: role.role,
        discordRoles: role.discord_roles
    });
}

export function getSkus() {
    return skus;
}