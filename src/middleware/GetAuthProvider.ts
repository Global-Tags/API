import AuthProvider from "../auth/AuthProvider";
import Elysia from "elysia";
import { getI18nFunctionByLanguage } from "./FetchI18n";

export default function getAuthProvider(app: Elysia) {
    return app.derive({ as: 'global' }, ({ headers, error }) => {
        const i18n = getI18nFunctionByLanguage(headers['x-minecraft-language']);
        const header = headers['authorization'];
        if(!header) return { provider: null };
        const provider = AuthProvider.getProvider(header);
        if(!provider) return error(401, { error: i18n('error.malformedAuthHeader') });
        return { provider };
    });
}