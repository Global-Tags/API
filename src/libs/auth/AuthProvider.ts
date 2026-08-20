import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "../Logger";
import { getOrCreatePlayer, Player, PlayerDocument } from "../database/schemas/Player";
import { stripUUID } from "../game-profiles";
import { Permission } from "../../types/Permission";

export class SessionData {
    public uuid: string | null;
    public player: PlayerDocument | null;
    public self: boolean;

    constructor(uuid: string | null, player: PlayerDocument | null, self?: boolean) {
        this.uuid = uuid;
        this.player = player;
        this.self = self !== undefined ? self : false;
    }

    public getOrCreateDocument(): Promise<PlayerDocument> {
        if(this.player) return Promise.resolve(this.player);
        if(!this.uuid) return Promise.reject(new Error('Cannot create player document without UUID'));
        return getOrCreatePlayer(this.uuid);
    }

    public selfOrHasPermission(permission: Permission): boolean {
        return this.self || this.player?.hasPermission(permission) || false;
    }
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
        if(!tokenUUID) return new SessionData(null, null);
        const data = await Player.findOne({ uuid: tokenUUID });
        return new SessionData(tokenUUID, data ? data : null, tokenUUID == uuid);
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