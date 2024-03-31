import { IpContext } from "../middleware/RatelimitChecker";
import { ratelimit } from "../../config.json";

type RatelimitData = {
    reset: number,
    limited: boolean,
    remaining: number
};

type RatelimiterKey = {
    method: string,
    regex: string
}

export default class Ratelimiter {
    private static ratelimiters: Map<RatelimiterKey, Ratelimiter> = new Map();
    private static enabled: boolean = ratelimit.active;
    public key;
    private players: Map<string, { requests: number, timestamp: number }> = new Map();
    private maxRequests: number;
    private resetAfter: number;

    public static initialize() {
        for(const route of ratelimit.routes) {
            const key: RatelimiterKey = { method: route.method, regex: route.regex };
            this.ratelimiters.set(key, new Ratelimiter(key));
        }
    }

    public static get(method: string, path: string): Ratelimiter | null {
        for(const key of this.ratelimiters.keys()) {
            const res = path.match(new RegExp(key.regex));
            if(res && method == key.method) return this.ratelimiters.get(key) || null;
        }
        return null;
    }

    constructor(key: RatelimiterKey) {
        this.key = key;
        const config: { max: number, seconds: number } = ratelimit.routes.find((route) => route.regex == key.regex)!;
        this.maxRequests = config.max;
        this.resetAfter = config.seconds * 1000;
        Ratelimiter.ratelimiters.set(key, this);
    }

    public ratelimitResponse({ set, error, ip }: IpContext): any {
        if(!Ratelimiter.enabled) return;
        const ratelimitData = this.getRatelimitData(ip?.address);
        set.headers[`X-RateLimit-Limit`] = String(this.maxRequests);
        set.headers[`X-RateLimit-Remaining`] = String(ratelimitData.remaining);
        set.headers[`X-RateLimit-Reset`] = String(ratelimitData.reset / 1000);
        if(ratelimitData.limited) return error(429, { error: `You're being ratelimited! Please try again in ${Math.ceil(ratelimitData.reset / 1000)} seconds!` });
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
            remaining: Math.max(this.maxRequests - player.requests, 0),
            reset: player.timestamp + this.resetAfter - Date.now()
        };
    }
}

function getValueFromRegex(path: string, map: Map<string, Ratelimiter>) {
    
  }