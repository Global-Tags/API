import { ButtonInteraction, GuildMember, Message } from "discord.js";
import Interaction, { InteractionOptions } from "./Interaction";
import { PlayerDocument } from "../../database/schemas/Player";

export default abstract class Button extends Interaction {
    public id: string;

    constructor({ id, allowWhenBanned, requireDiscordLink, requiredPermissions }: { id: string } & InteractionOptions) {
        super({ allowWhenBanned, requiredPermissions, requireDiscordLink });
        this.id = id;
    }

    public abstract trigger(interaction: ButtonInteraction, message: Message, member: GuildMember, player: PlayerDocument | null): any;
}