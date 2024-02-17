const { connect } = require('mongoose');

module.exports = {

    /**
     * 
     * @param {String} srv 
     */

    async connect(srv) {
        console.log(`[DB] Connecting...`);
        return await connect(srv).then(() => {
            server.db.initialized = true;
            return console.log('[DB] Connected!');
        });
    }
}