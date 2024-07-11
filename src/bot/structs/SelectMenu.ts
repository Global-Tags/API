import { GuildMember, Message, StringSelectMenuInteraction, User } from "discord.js";

export default abstract class SelectMenu {
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    public abstract selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, user: User): any;
}