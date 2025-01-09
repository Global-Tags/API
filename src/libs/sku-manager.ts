import skuConfig from "../../config/skus.json";

const skus: SKU[] = [];

export type SKU = {
    id: string;
    name: string,
    role: string,
    discordRole: string
}

for(const role of skuConfig) {
    skus.push({
        id: role.id,
        name: role.name,
        role: role.role,
        discordRole: role.discord_role
    });
}

export function getSkus() {
    return skus;
}