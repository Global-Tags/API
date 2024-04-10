import { verify } from "jsonwebtoken";
const publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt3rCKqrQYcmSEE8zyQTA7flKIe1pr7GHY58lTF74Pw/ZZYzxmScYteXp8XBvrQfPj4U/v9Vum8IPg6GHOv1Gde3rY5ydfunEKi/w4ibVN5buPpndzcNaMoQvEJ/B5VLIzCvLc5HepFKbKFOGu8XoFz8NZY0lUfGLR0rcDsHWZLHPhqYsIsUd9snkWkHaIKD7l9xTd77PpLZiBwCPnVhh3invFY2OnCL6BfiJhhud/aDaAzFW981J9EhyACbuac2qu6Uz2bKX/7Af01gUs48MbKUx8YirBWLD7j/CJMWorTT467It4mAvDlw43s3Py9IvxCzEFnOIftIv+7wwv1RjVQIDAQAB\n-----END PUBLIC KEY-----";

export function validJWTSession(token: string, uuid: string, equal: boolean): boolean {
    const tokenUuid = getUuidByJWT(token);
    if(equal) return tokenUuid === uuid;
    else return !!tokenUuid;
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