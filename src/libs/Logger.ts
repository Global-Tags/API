export default class Logger {
    public static info(text: string) {
        console.log(`[INFO]`, text);
    }

    public static warn(text: string) {
        console.log(`[WARN]`, text);
    }

    public static error(text: string) {
        console.log(`[ERROR]`, text);
    }
}