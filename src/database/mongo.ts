import mongoose from "mongoose";
import Logger from "../libs/Logger";

export async function connect(srv: string) {
    return await mongoose.connect(srv)
    .then(() => {
        Logger.info("Connected to MongoDB!");
    }).catch((err) => {
        Logger.error(`Failed to establish database connection! ${err}`);
        setTimeout(() => connect(srv), 5000);
    });
}

export function isConnected(): boolean {
    return mongoose.connection.readyState == 1;
}