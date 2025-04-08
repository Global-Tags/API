import { CommandInteraction, CommandInteractionOptionResolver, GuildMember } from "discord.js";
import { Player } from "../../database/schemas/players";
import Interaction, { InteractionOptions } from "./Interaction";

export default abstract class Command extends Interaction {
    public name: string;
    public description: string;
    public options: any;

    constructor({ name, description, options = [], allowWhenBanned, requiredPermissions, requireDiscordLink }: { name: string, description: string, options?: any } & InteractionOptions) {
        super({ allowWhenBanned, requiredPermissions, requireDiscordLink });
        this.name = name;
        this.description = description;
        this.options = options;
    }

    public abstract execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver, member: GuildMember, player: Player | null): any;
}