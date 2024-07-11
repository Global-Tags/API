import { verify } from "jsonwebtoken";
import players from "../database/schemas/players";
const publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt3rCKqrQYcmSEE8zyQTA7flKIe1pr7GHY58lTF74Pw/ZZYzxmScYteXp8XBvrQfPj4U/v9Vum8IPg6GHOv1Gde3rY5ydfunEKi/w4ibVN5buPpndzcNaMoQvEJ/B5VLIzCvLc5HepFKbKFOGu8XoFz8NZY0lUfGLR0rcDsHWZLHPhqYsIsUd9snkWkHaIKD7l9xTd77PpLZiBwCPnVhh3invFY2OnCL6BfiJhhud/aDaAzFW981J9EhyACbuac2qu6Uz2bKX/7Af01gUs48MbKUx8YirBWLD7j/CJMWorTT467It4mAvDlw43s3Py9IvxCzEFnOIftIv+7wwv1RjVQIDAQAB\n-----END PUBLIC KEY-----";

type SessionData = {
    uuid: string | null,
    equal: boolean,
    isAdmin: boolean
}

export async function getJWTSession(token: string, uuid: string): Promise<SessionData> {
    const tokenUuid = getUuidByJWT(token);
    if(!tokenUuid) return { uuid: tokenUuid, equal: tokenUuid == uuid, isAdmin: false };
    const data = await players.findOne({ uuid: tokenUuid });
    if(!data) return { uuid: tokenUuid, equal: tokenUuid == uuid, isAdmin: false };
    return {
        uuid: tokenUuid,
        equal: uuid == tokenUuid,
        isAdmin: data.isAdmin()
    }
}

type LabyPayload = {
    iss: string,
    uuid: string
}

export function getUuidByJWT(token: string): string | null {
    try {
        const payload: LabyPayload = verify(token, publicKey) as LabyPayload;
        if(payload.iss != `LabyConnect`) return null;

        return payload.uuid?.replaceAll(`-`, ``);
    } catch(err) {
        return null;
    }
}