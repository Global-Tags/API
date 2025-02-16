import { Context } from "elysia";
import Logger from "../libs/Logger";
import AuthProvider from "../auth/AuthProvider";
import { recordRequest } from "../libs/metrics";

export default function access({ request: { headers, method }, path }: Context) {
    const authorization = headers.get('authorization') || '';
    const agent = headers.get('x-agent') ? headers.get('x-agent') : 'API';
    const auth = AuthProvider.getProvider(authorization)?.id || `None${authorization.trim().length > 0 ? `: ${authorization}` : ''}`;

    if(path != '/ping') {
        recordRequest();
        Logger.debug(`${method} ${path} [${agent}] [${auth}]`);
    }
}