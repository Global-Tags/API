import { GuildMember, Message, StringSelectMenuInteraction } from "discord.js";
import Interaction, { InteractionOptions } from "./Interaction";
import { Player } from "../../database/schemas/players";

export default abstract class SelectMenu extends Interaction {
    public id: string;

    constructor({ id, allowWhenBanned, requiredPermissions, requireDiscordLink }: { id: string } & InteractionOptions) {
        super({ allowWhenBanned, requiredPermissions, requireDiscordLink });
        this.id = id;
    }

    public abstract selection(interaction: StringSelectMenuInteraction, message: Message, values: string[], member: GuildMember, player: Player | null): any;
}