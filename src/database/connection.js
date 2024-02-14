const { connect } = require('mongoose');

module.exports = {

    /**
     * 
     * @param {String} srv 
     */

    async connect(srv) {
        console.log(`[DB] Connecting...`);
        return await connect(srv).then(() => {
            return console.log('[DB] Connected!');
        });
    }
}