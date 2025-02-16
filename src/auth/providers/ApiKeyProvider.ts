import players from "../../database/schemas/players";
import AuthProvider from "../AuthProvider";

export default class ApiKeyProvider extends AuthProvider {
    constructor() {
        super('Bearer');
    }

    async getUUID(token: string): Promise<string | null> {
        token = AuthProvider.trimTokenType(token);
        const player = await players.findOne({ 'api_keys.key': token });
        if(!player) return null;
        const usedKey = player.api_keys.find(key => key.key === token);
        if(usedKey) {
            usedKey.last_used = new Date();
            await player.save();
        }
        return player.uuid;
    }
}