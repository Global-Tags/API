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
     */

    async validSession(sessionId, uuid) {
        // TODO: Change this in the future
        
        return true;
    }
}