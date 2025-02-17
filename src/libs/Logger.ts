import chalk from "chalk";
import { config } from "./config";
import moment from "moment";

enum LogLevel {
    Error,
    Warn,
    Info,
    Debug
}

export default class Logger {
    private static getTimestamp() {
        return chalk.gray(`[${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}]`);
    }
    
    public static debug(text: any) {
        if(LogLevel.Debug > Logger.getLoglevel()) return;
        console.log(Logger.getTimestamp(), chalk.blueBright('[DEBUG]'), text);
    }

    public static info(text: any) {
        if(LogLevel.Info > Logger.getLoglevel()) return;
        console.log(Logger.getTimestamp(), chalk.blue('[INFO]'), text);
    }

    public static warn(text: any) {
        if(LogLevel.Warn > Logger.getLoglevel()) return;
        console.log(Logger.getTimestamp(), chalk.yellow('[WARN]'), text);
    }

    public static error(text: any) {
        if(LogLevel.Error > Logger.getLoglevel()) return;
        console.log(Logger.getTimestamp(), chalk.red('[ERROR]'), text);
    }

    public static getLoglevel(): LogLevel {
        return LogLevel[config.logLevel as keyof typeof LogLevel] || LogLevel.Info;
    }
}