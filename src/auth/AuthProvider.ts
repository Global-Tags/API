import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "../libs/Logger";
import players, { Permission } from "../database/schemas/players";

export type SessionData = {
    uuid: string | null,
    equal: boolean,
    permissions: boolean
}

export default abstract class AuthProvider {
    private static providers = new Map<string, AuthProvider>();
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    public async getSession(token: string, uuid: string) {
        const tokenUuid = await this.getUUID(token);
        if(!tokenUuid) return { uuid: tokenUuid, equal: tokenUuid == uuid, hasPermission: (permission: Permission) => false };
        const data = await players.findOne({ uuid: tokenUuid });
        if(!data) return { uuid: tokenUuid, equal: tokenUuid == uuid, hasPermission: (permission: Permission) => false };
        return {
            uuid: tokenUuid,
            equal: uuid == tokenUuid,
            hasPermission: (permission: Permission) => data.hasPermissionSync(permission)
        }
    }
    public abstract getUUID(token: string): Promise<string | null>;

    public trimTokenType(token: string): string {
        return token.split(/ /).slice(1).join(' ');
    }

    static async loadProviders() {
        const directory = join(__dirname, `providers`);
        if(existsSync(directory)) {
            for(const file of readdirSync(directory).filter(file => file.endsWith(`.ts`))) {
                const provider = new (await import(join(directory, file))).default as AuthProvider;
    
                AuthProvider.providers.set(provider.id, provider);
            }
            Logger.debug(`Loaded ${AuthProvider.providers.size} auth providers!`);
        }
    }

    public static getProvider(token: string): AuthProvider | null {
        return AuthProvider.providers.get(token.split(' ')[0]) || null;
    }
}