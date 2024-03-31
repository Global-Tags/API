import { GuildMember, Message, ModalSubmitFields, ModalSubmitInteraction, User } from "discord.js";

export default abstract class Modal {
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    public abstract submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, user: User): any;
}