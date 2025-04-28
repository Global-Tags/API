import { AutocompleteInteraction, CacheType, CommandInteraction, CommandInteractionOptionResolver, GuildMember } from "discord.js";
import { Player } from "../../database/schemas/players";
import Interaction, { InteractionOptions } from "./Interaction";

export type CommandOptions = Omit<CommandInteractionOptionResolver<CacheType>, "getMessage" | "getFocused">;
export type AutocompleteOptions = Omit<CommandInteractionOptionResolver<CacheType>, "getMessage" | "getChannel" | "getUser" | "getMember" | "getRole" | "getAttachment" | "getMentionable">;

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

    public abstract execute(interaction: CommandInteraction, options: CommandOptions, member: GuildMember, player: Player | null): any;
    public autocomplete(interaction: AutocompleteInteraction, options: AutocompleteOptions, member: GuildMember, player: Player | null): any {};
}