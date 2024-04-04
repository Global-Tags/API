import { Context } from "elysia";
import Ratelimiter from "../libs/Ratelimiter";

export type IpContext = Context & {
    ip: string
};

export default function checkRatelimit(ctx: Context) {
    const ratelimiter = Ratelimiter.get(ctx.request.method, ctx.path);
    if(!ratelimiter) return;

    return ratelimiter.ratelimitResponse(ctx as IpContext);
}