import { IpContext } from "../middleware/ratelimit-checker";
import { config } from "./config";
import ratelimiterConfig from "../../config/ratelimiter.json";

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
    private static enabled: boolean = config.ratelimiter.enabled;
    public key;
    private players: Map<string, { requests: number, timestamp: number }> = new Map();
    private maxRequests: number;
    private resetAfter: number;

    public static initialize() {
        for(const route of ratelimiterConfig) {
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
        const config: { max: number, seconds: number } = ratelimiterConfig.find((route) => route.regex == key.regex)!;
        this.maxRequests = config.max;
        this.resetAfter = config.seconds * 1000;
        Ratelimiter.ratelimiters.set(key, this);
    }

    public ratelimitResponse({ set, error, ip, i18n }: IpContext): any {
        if(!Ratelimiter.enabled) return;
        const ratelimitData = this.getRatelimitData(ip);
        set.headers['X-RateLimit-Limit'] = String(this.maxRequests);
        set.headers['X-RateLimit-Remaining'] = String(ratelimitData.remaining);
        set.headers['X-RateLimit-Reset'] = String(ratelimitData.reset / 1000);
        if(ratelimitData.limited) return error(429, { error: i18n('error.ratelimit').replaceAll('<seconds>', String(Math.ceil(ratelimitData.reset / 1000))) });
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