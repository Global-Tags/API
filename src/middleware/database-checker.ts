import { PreContext } from "elysia";
import { isConnected } from "../database/mongo";
import { getI18nFunctionByLanguage } from "./fetch-i18n";

export default function checkDatabase({ error, request: { headers } }: PreContext) {
    const i18n = getI18nFunctionByLanguage(headers.get('x-language') || undefined);
    if(!isConnected()) return error(503, { error: i18n('$.error.database') });
}