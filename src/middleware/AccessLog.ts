import { Context } from "elysia";
import Logger from "../libs/Logger";
import moment = require("moment");
import { logTimeFormat } from "../../config.json";
import AuthProvider from "../auth/AuthProvider";

export default function access({ request: { headers, method }, path }: Context) {
    const version = headers.get('x-addon-version') ? `Addon v${headers.get(`x-addon-version`)}` : 'API';
    const auth = AuthProvider.getProvider(headers.get('authorization') || '')?.id || 'None';
    const time = moment(new Date()).format(logTimeFormat);

    if(path != `/ping`) Logger.debug(`[${time}] ${method} ${path} [${version}] [${auth}]`);
}