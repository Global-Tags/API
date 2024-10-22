import axios from "axios";

export type Profile = {
    uuid: string | null,
    username: string | null,
    error: string | null
}

export async function getProfileByUUID(uuid: string): Promise<Profile> {
    try {
        const res = await axios({
            method: `get`,
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
            method: `get`,
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