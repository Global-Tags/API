import Elysia from "elysia";
import { getLocales, getPath } from "../libs/I18n";

export default function fetchI18n(app: Elysia) {
    return app.derive({ as: 'global' }, ({ headers }) => ({
        i18n: getI18nFunctionByLanguage(headers[`x-language`]),
        language: headers['x-language']
    }));
}

export function getI18nFunctionByLanguage(language: string | null = null) {
    const locales = getLocales(language || 'en_us');
    return (path: string) => getPath(path, locales);
}