import { ButtonInteraction, GuildMember, Message, User } from "discord.js";

export default abstract class Button {
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    public abstract trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, user: User): any;
}