const { connect } = require('mongoose');

module.exports = {

    /**
     * 
     * @param {String} srv 
     */

    async connect(srv) {
        if(!srv) return console.error('[DB] No SRV Provided!');
        await connect(srv, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        }).then(() => {
            console.log('[DB] Connected!');
        });
    }
}