const { CronJob } = require('cron');
const { connect, connection } = require('mongoose');

module.exports = {

    /**
     * 
     * @param {String} srv 
     */

    async connect(srv) {
        console.log(`[DB] Connecting...`);
        connect(srv).then(() => {
            server.db.initialized = true;
            if(server.cfg.bot.enabled) require(`../../bot`);
            console.log('[DB] Connected!');

            new CronJob(`*/5 * * * *`, () => {
                if(!connection) {
                    console.log(`[DB] Lost connection!`);
                    this.connect(srv);
                }
            });
        }).catch((err) => {
            console.error(new Error(err));
            setTimeout(() => this.connect(srv), 5000);
        });
    }
}