import AuthProvider from "../auth/AuthProvider";
import Elysia from "elysia";

export default function getAuthProvider(app: Elysia) {
    return app.derive({ as: 'global' }, ({ headers }) => {
        const header = headers['authorization'];
        if(!header) return { provider: null };
        const provider = AuthProvider.getProvider(header);
        if(!provider) return { provder: null };
        return { provider };
    });
}