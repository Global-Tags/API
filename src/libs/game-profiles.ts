import axios from "axios";

export type Profile = {
    uuid: string | null,
    username: string | null,
    error: string | null
}

export async function getProfileByUUID(uuid: string): Promise<Profile> {
    try {
        const res = await axios({
            method: 'get',
            url: `https://api.mojang.com/user/profile/${uuid}`,
            headers: {
                'Accept-Encoding': 'gzip'
            }
        });

        return {
            uuid: res.data.id,
            username: res.data.name,
            error: null
        }
    } catch(err: any) {
        return {
            uuid,
            username: null,
            error: err?.response?.data.errorMessage
        }
    }
}

export async function getProfileByUsername(username: string): Promise<Profile> {
    try {
        const res = await axios({
            method: 'get',
            url: `https://api.mojang.com/users/profiles/minecraft/${username}`,
            headers: {
                'Accept-Encoding': 'gzip'
            }
        });

        return {
            uuid: res.data.id,
            username: res.data.name,
            error: null
        }
    } catch(err: any) {
        return {
            uuid: null,
            username: username,
            error: err?.response?.data.errorMessage
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