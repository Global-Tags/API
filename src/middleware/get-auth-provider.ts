import AuthProvider from "../auth/AuthProvider";
import Elysia from "elysia";

export default function getAuthProvider(app: Elysia) {
    return app.derive({ as: 'global' }, async ({ params, headers }) => {
        const header = headers['authorization'];
        if(!header) return { provider: null };
        const provider = AuthProvider.getProvider(header);
        const uuid = params?.['uuid'];
        return { provider, session: await provider?.getSession(header, uuid) || null };
    });
}