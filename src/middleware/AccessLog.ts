import { Context, PreContext } from "elysia";
import Logger from "../libs/Logger";
import moment = require("moment");
import { logTimeFormat } from "../../config.json";

export default function access({ request: { headers, method }, path }: Context) {
    const version = headers.get(`x-addon-version`) ? `Addon v${headers.get(`x-addon-version`)}` : `API`;
    const time = moment(new Date()).format(logTimeFormat);

    Logger.debug(`[${time}] ${method} ${path} [${version}] [${!!headers.get(`authorization`) ? `` : `NO `}AUTH]`)
}