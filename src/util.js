const { default: axios } = require('axios');
const { Request, Response, NextFunction } = require('express');

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

    async validSession(sessionId, uuid, equal) {
        const sessionUuid = await this.getUuidbySession(sessionId);
        if(equal) return sessionUuid === uuid;
        else return !!sessionUuid;
    },

    /**
     * 
     * @param {string} sessionId 
     * @returns 
     */

    async getUuidbySession(sessionId) {
        try {
            const response = await axios.get(`https://api.minecraftservices.com/minecraft/profile`, {
                headers: {
                    Authorization: `Bearer ${sessionId}`
                }
            });

            return response.data.id;
        } catch(error) {
            return null;
        }
    }
}