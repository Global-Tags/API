import Elysia from "elysia";
import { getLocales, getPath } from "../libs/I18n";

export default function fetchI18n(app: Elysia) {
    return app.derive({ as: 'global' }, ({ headers }) => {
        const header = headers[`x-minecraft-language`] || `en_us`;
        const locales = getLocales(header);
        return {
            i18n: (path: string) => getPath(path, locales)
        };
    });
}