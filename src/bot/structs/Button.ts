import { ButtonInteraction, GuildMember, Message } from "discord.js";
import Interaction, { InteractionOptions } from "./Interaction";
import { Player } from "../../database/schemas/players";

export default abstract class Button extends Interaction {
    public id: string;

    constructor({ id, allowWhenBanned, requireDiscordLink, requiredPermissions }: { id: string } & InteractionOptions) {
        super({ allowWhenBanned, requiredPermissions, requireDiscordLink });
        this.id = id;
    }

    public abstract trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: Player | null): any;
}