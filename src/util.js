const { Request, Response, NextFunction } = require('express');
const jwt = require(`jsonwebtoken`);

module.exports = {

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */

    catchError(req, res, next) {
        res.status(404).send({
            error: `404: Not Found`
        });
    },

    /**
     * 
     * @param {string} sessionId 
     * @param {string} uuid 
     * @param {boolean} equal 
     */

    validJWTSession(token, uuid, equal) {
        const tokenUuid = this.getUuidByJWT(token);
        if(equal) return tokenUuid === uuid;
        else return !!tokenUuid;
    },

    /**
     * 
     * @param {string} token 
     * @returns {string?}
     */

    getUuidByJWT(token) {
        const decodedToken = jwt.decode(token, { complete: true });
        if(!decodedToken) return null;
        if(decodedToken.payload.iss != `LabyConnect`) return null;
        
        try {
            const verifiedToken = jwt.verify(token, server.cfg.labyConnect);
    
            return verifiedToken.uuid?.replaceAll(`-`, ``);
        } catch(err) {
            return null;
        }
    },

    /**
     * @typedef {{ players: Map<String, { requests: number, timestamp: number }>, max: number, time: number }} RateLimit
     */

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {RateLimit} ratelimit 
     * @returns 
     */

    ratelimitResponse(req, res, ratelimit) {
        if(!server.cfg.ratelimit.active) return false;
        const ratelimitData = server.util.getRatelimitData(req.ip, ratelimit);
        res.setHeader(`X-RateLimit-Limit`, ratelimit.max);
        if(!ratelimitData.limited) res.setHeader(`X-RateLimit-Remaining`, ratelimitData.remaining); // ik this looks weird but the order of the headers is important
        res.setHeader(`X-RateLimit-Reset`, ratelimitData.reset / 1000);
        if(ratelimitData.limited) {
            res.status(429).send({ error: `You're being ratelimited! Please try again in ${Math.ceil(ratelimitData.reset / 1000)} seconds!` });
            return true;
        }
        return false;
    },

    /**
     * 
     * @param {string} ip 
     * @param {RateLimit} ratelimit 
     * @returns {{ reset: number } & ({ limited: true } | { limited: false, remaining: number })}
     */

    getRatelimitData(ip, ratelimit) {
        const player = ratelimit.players.get(ip);
        if(!player) {
            ratelimit.players.set(ip, {
                requests: 1,
                timestamp: Date.now()
            });
            return {
                remaining: ratelimit.max - 1,
                limited: false,
                reset: ratelimit.time
            };
        };
        if(Date.now() - player.timestamp >= ratelimit.time) {
            ratelimit.players.delete(ip);
            return this.getRatelimitData(ip, ratelimit);
        }
        return {
            limited: player.requests++ >= ratelimit.max,
            remaining: ratelimit.max - player.requests,
            reset: player.timestamp + ratelimit.time - Date.now()
        };
    }
}