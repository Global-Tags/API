import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "../libs/Logger";
import players, { Player } from "../database/schemas/players";
import { stripUUID } from "../libs/game-profiles";

export type SessionData = {
    uuid: string | null,
    player: Player | null,
    self: boolean
}

export default abstract class AuthProvider {
    private static providers = new Map<string, AuthProvider>();
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    public async getSession(token: string, uuid?: string | null): Promise<SessionData> {
        const tokenUUID = await this.getUUID(token);
        if(uuid) uuid = stripUUID(uuid);
        if(!tokenUUID) return { uuid: null, player: null, self: false };
        const data = await players.findOne({ uuid: tokenUUID });
        if(!data) return { uuid: tokenUUID, player: null, self: tokenUUID == uuid };
        return {
            uuid: tokenUUID,
            player: data,
            self: uuid == tokenUUID
        }
    }
    public abstract getUUID(token: string): Promise<string | null>;

    public static trimTokenType(token: string): string {
        return token.split(/ /).slice(1).join(' ');
    }

    static async loadProviders() {
        const directory = join(__dirname, 'providers');
        if(existsSync(directory)) {
            for(const file of readdirSync(directory).filter(file => file.endsWith('.ts'))) {
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