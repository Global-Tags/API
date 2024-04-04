import { CommandInteraction, CommandInteractionOptionResolver, GuildMember, User } from "discord.js";

export default abstract class Command {
    public name: string;
    public description: string;
    public options: any;

    constructor(name: string, description: string, options: any) {
        this.name = name;
        this.description = description;
        this.options = options;
    }

    public abstract execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, user: User): any;
}