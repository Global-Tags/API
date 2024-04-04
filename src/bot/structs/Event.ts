export default abstract class Event {
    public name: string;
    public once: boolean;

    constructor(name: string, once: boolean) {
        this.name = name;
        this.once = once;
    }

    public abstract fire(...params: any): any;
}