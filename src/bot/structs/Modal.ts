import { GuildMember, Message, ModalSubmitFields, ModalSubmitInteraction } from "discord.js";
import Interaction, { InteractionOptions } from "./Interaction";
import { PlayerDocument } from "../../database/schemas/Player";

export default abstract class Modale extends Interaction {
    public id: string;

    constructor({ id, allowWhenBanned, requiredPermissions, requireDiscordLink }: { id: string } & InteractionOptions) {
        super({ allowWhenBanned, requiredPermissions, requireDiscordLink });
        this.id = id;
    }

    public abstract submit(interaction: ModalSubmitInteraction, message: Message, fields: ModalSubmitFields, member: GuildMember, player: PlayerDocument | null): any;
}