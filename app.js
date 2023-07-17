const express = require(`express`);
const http = require(`http`);
const parser = require(`body-parser`);
const { readdirSync } = require(`fs`);
const app = express();
app.use(parser.json());

// Server configuration
global.server = {};
server.cfg = require(`./config.json`);
server.util = require(`./src/util`);

// Database
server.db = {};
server.db.connection = require(`./src/database/connection`);
server.db.players = require(`./src/database/schemas/player`);

server.http = http.createServer(app).listen(server.cfg.port, () => {
    console.log(`[SERVER] HTTP listening on Port ${server.cfg.port}`);

    server.db.connection.connect(server.cfg.srv);
});

app.get(`/`, (req, res) => {
    res.send({
        version: require(`./package.json`).version
    });
});

readdirSync(`./src/routes`).filter(file => file.endsWith(`.js`)).forEach(file => {
    /**
     * @type {express.IRouter}
     */
    const route = require(`./src/routes/${file}`);

    app.use(`/${file.slice(0, -3)}`, route);
    route.use(server.util.catchError);
    console.log(`[SERVER] Loaded Route /${file.slice(0, -3)}`);
});

app.use(server.util.catchError);