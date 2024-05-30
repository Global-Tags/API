import chalk from "chalk";
import { logLevel } from "../../config.json";

enum LogLevel {
    Error,
    Warn,
    Info,
    Debug
}

export default class Logger {
    public static debug(text: any) {
        if(LogLevel.Debug > Logger.getLoglevel()) return;
        console.log(chalk.blueBright(`[DEBUG]`), text);
    }

    public static info(text: any) {
        if(LogLevel.Info > Logger.getLoglevel()) return;
        console.log(chalk.blue(`[INFO]`), text);
    }

    public static warn(text: any) {
        if(LogLevel.Warn > Logger.getLoglevel()) return;
        console.log(chalk.yellow(`[WARN]`), text);
    }

    public static error(text: any) {
        if(LogLevel.Error > Logger.getLoglevel()) return;
        console.log(chalk.red(`[ERROR]`), text);
    }

    public static getLoglevel(): LogLevel {
        return LogLevel[logLevel as keyof typeof LogLevel] || LogLevel.Info;
    }
}