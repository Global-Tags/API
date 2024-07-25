import { PreContext } from "elysia";
import { getI18nFunctionByLanguage } from "./FetchI18n";

const semanticVersion = /^\d+\.\d+\.\d+$/;
const requiredVersion = '1.2.1'; // That's the release where the Addon started using the new token prefix and the roles array instead of the admin boolean

export function verifyVersion({ error, request: { headers } }: PreContext) {
    const i18n = getI18nFunctionByLanguage(headers.get('x-language'));
    const version = headers.get(`x-addon-version`);
    if(!version || !semanticVersion.test(version)) return;
    const number = parseInt(version.replaceAll('.', ''));
    if(isNaN(number)) return;
    const requiredVersionNumber = parseInt(requiredVersion.replaceAll('.', ''));
    if(isNaN(requiredVersionNumber)) return;
    if(number < requiredVersionNumber) return error(400, { error: i18n(`error.update`) });
}