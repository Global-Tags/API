import Elysia from "elysia";
import { getLocales, getPath } from "../libs/I18n";

export default function fetchI18n(app: Elysia) {
    return app.derive({ as: 'global' }, ({ headers }) => ({
        i18n: getI18nFunctionByLanguage(headers[`x-minecraft-language`] || `en_us`)
    }));
}

export function getI18nFunctionByLanguage(language: string) {
    const locales = getLocales(language);
    return (path: string) => getPath(path, locales);
}