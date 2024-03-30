import { Context } from "elysia";
import { ratelimit } from "../../config.json";

enum RatelimitType {
    GetTag,
    ChangeTag,
    ChangePosition,
    ChangeIcon,
    Report
}

type RatelimitData = {
    reset: number,
    limited: boolean,
    remaining: number
};

class Ratelimiter {
    private static ratelimiters: Map<RatelimitType, Ratelimiter> = new Map();
    private static enabled: boolean = ratelimit.active;
    private type: RatelimitType;
    private players: Map<string, { requests: number, timestamp: number }> = new Map();
    private maxRequests: number;
    private resetAfter: number;

    constructor(type: RatelimitType) {
        this.type = type;
        const config: { max: number, seconds: number } = ratelimit.actions[type.toString() as keyof typeof ratelimit.actions];
        this.maxRequests = config.max;
        this.resetAfter = config.seconds * 1000;
        Ratelimiter.ratelimiters.set(type, this);
    }

    public ratelimitResponse({ set, error }: Context): boolean {
        if(!Ratelimiter.enabled) return false;
        const ratelimitData = this.getRatelimitData("");
        set.headers[`X-RateLimit-Limit`] = String(this.maxRequests.toString);
        set.headers[`X-RateLimit-Remaining`] = String(ratelimitData.remaining);
        set.headers[`X-RateLimit-Reset`] = String(ratelimitData.reset / 1000);
        if(ratelimitData.limited) {
            error(429, { error: `You're being ratelimited! Please try again in ${Math.ceil(ratelimitData.reset / 1000)} seconds!` });
            return true;
        }
        return false;
    }

    public getRatelimitData(ip: string): RatelimitData {
        const player = this.players.get(ip);
        if(!player) {
            this.players.set(ip, {
                requests: 1,
                timestamp: Date.now()
            });
            return {
                remaining: this.maxRequests - 1,
                limited: false,
                reset: this.resetAfter
            };
        };
        if(Date.now() - player.timestamp >= this.resetAfter) {
            this.players.delete(ip);
            return this.getRatelimitData(ip);
        }
        return {
            limited: player.requests++ >= this.maxRequests,
            remaining: this.maxRequests - player.requests,
            reset: player.timestamp + this.resetAfter - Date.now()
        };
    }
}