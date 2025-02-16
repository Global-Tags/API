import axios from "axios";

export class GameProfile {
    uuid: string | null
    username: string | null
    error: string | null

    constructor(uuid: string | null, username: string | null, error: string | null) {
        this.uuid = uuid;
        this.username = username;
        this.error = error;
    }

    getUsernameOrUUID(): string {
        return this.username ?? this.uuid ?? 'Unknown';
    }

    getUuidOrUsername(): string {
        return this.uuid ?? this.username ?? 'Unknown';
    }

    getFormattedHyperlink(bold = false): string {
        return `${bold ? '**' : ''}[\`${this.getUsernameOrUUID()}\`](<https://laby.net/@${this.uuid}>)${bold ? '**' : ''}`;
    }

    static async getProfileByUsername(username: string): Promise<GameProfile> {
        try {
            const res = await axios({
                method: 'get',
                url: `https://api.mojang.com/users/profiles/minecraft/${username}`,
                headers: {
                    'Accept-Encoding': 'gzip'
                }
            });

            return new GameProfile(res.data.id, res.data.name, null);
        } catch(err: any) {
            return new GameProfile(null, username, err?.response?.data.errorMessage);
        }
    }

    static async getProfileByUUID(uuid: string): Promise<GameProfile> {
        try {
            const res = await axios({
                method: 'get',
                url: `https://api.mojang.com/user/profile/${uuid}`,
                headers: {
                    'Accept-Encoding': 'gzip'
                }
            });
    
            return new GameProfile(res.data.id, res.data.name, null);
        } catch(err: any) {
            return new GameProfile(uuid, null, err?.response?.data.errorMessage);
        }
    }
}

export function formatUUID(uuid: string): string {
    const cleanedUUID = uuid.replace(/-/g, '');
    
    if(cleanedUUID.length != 32) throw new Error('Invalid UUID length: Expected 32 characters without dashes.');
    
    return `${cleanedUUID.slice(0, 8)}-${cleanedUUID.slice(8, 12)}-${cleanedUUID.slice(12, 16)}-${cleanedUUID.slice(16, 20)}-${cleanedUUID.slice(20)}`;
}

export function stripUUID(uuid: string): string {
    return uuid.replace(/-/g, '');
}