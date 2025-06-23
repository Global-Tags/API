import mongoose from "mongoose";
import Logger from "../libs/Logger";
import { destroy, registerFeatures, spawn } from "../bot/bot";
import { config } from "../libs/config";

let registered = false;

export async function connect(connectionString: string) {
    registerEventHandler(connectionString);
    return await mongoose.connect(connectionString)
    .catch((err) => Logger.error(`Failed to establish database connection! ${err}`));
}

function registerEventHandler(connectionString: string) {
    if(registered) return;
    if(config.discordBot.enabled) registerFeatures();

    mongoose.connection.on('connected', () => {
        Logger.info('Connected to database!');
        if(config.discordBot.enabled) spawn();
    }).on('disconnected', () => {
        Logger.error('Lost database connection');
        if(config.discordBot.enabled) destroy();
        setTimeout(() => connect(connectionString), 10000);
    }).on('connecting', () => Logger.debug('Connecting to database...'));
    registered = true;
}

export function isConnected(): boolean {
    return mongoose.connection.readyState == 1;
}