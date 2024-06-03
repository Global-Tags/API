import Logger from "./Logger";

export default function handleErrors() {
    Logger.debug(`Exception handler initialized.`);
    process.on('unhandledRejection', (reason, promise) => Logger.error(`Unhandled rejection at: "${promise}". Reason: "${reason}"`));
    process.on('uncaughtException', (error) => Logger.error(`Unhandled exception: "${error}"`));
}