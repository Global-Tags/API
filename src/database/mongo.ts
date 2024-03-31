import mongoose from "mongoose";
import Logger from "../libs/Logger";
import * as config from "../../config.json";

export async function connect(srv: string) {
    return await mongoose.connect(srv)
    .then(() => {
        Logger.info("Connected to MongoDB!");
        if(config.bot.enabled) import("../bot/bot");
    }).catch((err) => {
        Logger.error(`Failed to establish database connection! ${err}`);
        setTimeout(() => connect(srv), 5000);
    });
}

export function isConnected(): boolean {
    return mongoose.connection.readyState == 1;
}