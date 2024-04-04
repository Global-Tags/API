import mongoose from "mongoose";
import Logger from "../libs/Logger";
import { destroy, spawn } from "../bot/bot";
import * as config from "../../config.json";

export async function connect(srv: string) {
    _eventHandler(srv);
    return await _connect(srv);
}

async function _connect(srv: string) {
    return await mongoose.connect(srv)
    .catch((err) => Logger.error(`Failed to establish database connection! ${err}`));
}

function _eventHandler(srv: string) {
    const connection = mongoose.connection;
    connection.on(`connected`, () => {
        Logger.info("Connected to database!");
        if(config.bot.enabled) spawn();
    }).on(`disconnected`, () => {
        Logger.error("Lost database connection");
        if(config.bot.enabled) destroy();
        setTimeout(() => _connect(srv), 10000);
    }).on(`connecting`, () => Logger.debug(`Connecting to database...`));
}

export function isConnected(): boolean {
    return mongoose.connection.readyState == 1;
}