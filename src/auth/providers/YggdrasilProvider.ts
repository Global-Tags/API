import AuthProvider from "../AuthProvider";
import axios from "axios";

export default class LabyConnectProvider extends AuthProvider {
    constructor() {
        super('Minecraft');
    }

    async getUUID(token: string): Promise<string | null> {
        try {
            const response = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
                headers: {
                    Authorization: `Bearer ${this.trimTokenType(token)}`
                }
            });

            return response.data.id as string;
        } catch(err) {
            return null;
        }
    }
}