import { verify } from "jsonwebtoken";
import { labyConnect } from "../../config.json";

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
        const payload: LabyPayload = verify(token, labyConnect) as LabyPayload;
        if(payload.iss != `LabyConnect`) return null;

        return payload.uuid?.replaceAll(`-`, ``);
    } catch(err) {
        return null;
    }
}