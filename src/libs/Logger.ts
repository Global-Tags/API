import chalk from "chalk";

export default class Logger {
    public static info(text: string) {
        console.log(chalk.blue(`[INFO]`), text);
    }

    public static warn(text: string) {
        console.log(chalk.yellow(`[WARN]`), text);
    }

    public static error(text: string) {
        console.log(chalk.red(`[ERROR]`), text);
    }
}