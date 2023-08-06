const express = require(`express`);
const http = require(`http`);
const parser = require(`body-parser`);
const moment = require(`moment`);
const { readdirSync } = require(`fs`);
const app = express();
app.use(parser.json());
app.disable(`x-powered-by`);

// Server configuration
global.server = {};
server.cfg = require(`./config.json`);
server.util = require(`./src/util`);
app.set(`trust proxy`, server.cfg.proxied);

// Database
server.db = {};
server.db.connection = require(`./src/database/connection`);
server.db.players = require(`./src/database/schemas/player`);

/**
 * @typedef {Map<String, { requests: number, timestamp: number }>} PlayerMap
 */

// Ratelimit
server.ratelimit = {};
server.ratelimit.getTag = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.getTag.max,
    time: server.cfg.ratelimit.getTag.seconds * 1000
};
server.ratelimit.changeTag = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.changeTag.max,
    time: server.cfg.ratelimit.changeTag.seconds * 1000
};
server.ratelimit.changePosition = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.changePosition.max,
    time: server.cfg.ratelimit.changePosition.seconds * 1000
}
server.ratelimit.report = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.reportPlayer.max,
    time: server.cfg.ratelimit.reportPlayer.seconds * 1000
};

server.http = http.createServer(app).listen(server.cfg.port, () => {
    console.log(`[SERVER] HTTP listening on Port ${server.cfg.port}`);

    server.db.connection.connect(server.cfg.srv);
});

app.use((req, res, next) => {
    const version = req.headers[`x-addon-version`] ? `Addon v${req.headers[`x-addon-version`]}` : `API`;
    const time = moment(new Date()).format(server.cfg.logTimeFormat);

    console.log(`[${time}] ${req.method.toUpperCase()} ${req.path} [${version}] [${!!req.headers.authorization ? `` : `NO `}AUTH]`);
    next();
});

app.use((req, res, next) => {
    const requiredVersion = server.cfg.requiredAddonVersion.replaceAll(`.`, ``);
    let version = req.headers[`x-addon-version`];
    if(!version) return next();
    version = version.replaceAll(`.`, ``);
    if(isNaN(version) || isNaN(requiredVersion)) return next();
    if(parseInt(version) < parseInt(requiredVersion)) return res.status(400).send({
        error: `The API needs a newer addon version. Please update the Addon to v${server.cfg.requiredAddonVersion}!`
    });
    next();
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