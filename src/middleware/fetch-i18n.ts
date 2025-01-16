import Elysia from "elysia";
import { getLanguage, translate } from "../libs/i18n";

export default function fetchI18n(app: Elysia) {
    return app.derive({ as: 'global' }, ({ headers }) => ({
        i18n: getI18nFunctionByLanguage(headers['x-language']),
        language: headers['x-language']
    }));
}

export function getI18nFunctionByLanguage(language: string | undefined = undefined) {
    return (path: string) => translate(path, getLanguage(language));
}