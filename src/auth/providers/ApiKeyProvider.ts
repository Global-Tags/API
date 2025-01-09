import players from "../../database/schemas/players";
import AuthProvider from "../AuthProvider";

export default class ApiKeyProvider extends AuthProvider {
    constructor() {
        super('Bearer');
    }

    async getUUID(token: string): Promise<string | null> {
        const player = await players.findOne({ api_keys: AuthProvider.trimTokenType(token) });
        if(!player) return null;
        return player.uuid;
    }
}