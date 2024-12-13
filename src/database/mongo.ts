import mongoose from "mongoose";
import Logger from "../libs/Logger";
import { destroy, spawn } from "../bot/bot";
import { config } from "../libs/Config";

export async function connect(connectionString: string) {
    _eventHandler(connectionString);
    return await _connect(connectionString);
}

async function _connect(connectionString: string) {
    return await mongoose.connect(connectionString)
    .catch((err) => Logger.error(`Failed to establish database connection! ${err}`));
}

function _eventHandler(connectionString: string) {
    const connection = mongoose.connection;
    connection.on(`connected`, () => {
        Logger.info("Connected to database!");
        if(config.discordBot.enabled) spawn();
    }).on(`disconnected`, () => {
        Logger.error("Lost database connection");
        if(config.discordBot.enabled) destroy();
        setTimeout(() => _connect(connectionString), 10000);
    }).on(`connecting`, () => Logger.debug(`Connecting to database...`));
}

export function isConnected(): boolean {
    return mongoose.connection.readyState == 1;
}