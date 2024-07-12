import AuthProvider from "../AuthProvider";
import axios from "axios";

export default class LabyConnectProvider extends AuthProvider {
    constructor() {
        super('Minecraft');
    }

    async getUUID(token: string): Promise<string | null> {
        try {
            // TODO: Fix request
            const response = await axios({
                method: 'GET',
                url: '...',
                data: {

                }
            });
            return response.data.uuid as string;
        } catch(err) {
            return null;
        }
    }
}