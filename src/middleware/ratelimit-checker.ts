import { Context } from "elysia";
import Ratelimiter from "../libs/Ratelimiter";
import { I18nFunction } from "../libs/i18n";

export type IpContext = Context & {
    ip: string,
    i18n: I18nFunction
};

export default function checkRatelimit(ctx: Context) {
    const ratelimiter = Ratelimiter.get(ctx.request.method, ctx.path);
    if(!ratelimiter) return;

    return ratelimiter.ratelimitResponse(ctx as IpContext);
}