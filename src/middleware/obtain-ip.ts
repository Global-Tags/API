import { Elysia } from 'elysia';

export type IPHeader = 'x-real-ip' | 'x-client-ip' | 'cf-connecting-ip' | 'fastly-client-ip' | 'x-cluster-client-ip' | 'x-forwarded' | 'forwarded-for' | 'forwarded' | 'x-forwarded' | 'appengine-user-ip' | 'true-client-ip' | 'cf-pseudo-ipv4' | (string & {});
export const headersToCheck: IPHeader[] = [
    'x-real-ip', // Nginx proxy/FastCGI
    'x-client-ip', // Apache https://httpd.apache.org/docs/2.4/mod/mod_remoteip.html#page-header 
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'x-cluster-client-ip', // GCP
    'x-forwarded', // General Forwarded
    'forwarded-for', // RFC 7239
    'forwarded', // RFC 7239
    'x-forwarded', // RFC 7239
    'appengine-user-ip', // GCP
    'true-client-ip', // Akamai and Cloudflare
    'cf-pseudo-ipv4', // Cloudflare 
]

export const getIP = (headers: Headers, checkHeaders: IPHeader[] = headersToCheck) => {
    if(typeof checkHeaders === 'string' && headers.get(checkHeaders)) return headers.get(checkHeaders);
    if(headers.get('x-forwarded-for')) return headers.get('x-forwarded-for')?.split(',')[0];
    let clientIP: string | undefined | null = null;
    if(!checkHeaders) return null;
    for(const header of checkHeaders) {
        clientIP = headers.get(header);
        if(clientIP) break;
    }
    return clientIP;
}

export const ip = (config: {
    checkHeaders?: IPHeader[]
} = {}) => (app: Elysia) => {
    return app.derive({ as: 'global' }, ({ request }) => {
        return {
            ip: getIP(request.headers, config.checkHeaders)
        };
    })
}