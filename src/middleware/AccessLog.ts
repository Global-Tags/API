import { Context } from "elysia";
import Logger from "../libs/Logger";
import moment = require("moment");
import { logTimeFormat } from "../../config.json";
import AuthProvider from "../auth/AuthProvider";

export default function access({ request: { headers, method }, path }: Context) {
    const authorization = headers.get('authorization') || '';
    const agent = headers.get('x-agent') ? headers.get('x-agent') : 'API';
    const auth = AuthProvider.getProvider(authorization)?.id || `None${authorization.trim().length > 0 ? `: ${authorization}` : ''}`;
    const time = moment(new Date()).format(logTimeFormat);

    if(path != `/ping`) Logger.debug(`[${time}] ${method} ${path} [${agent}] [${auth}]`);
}