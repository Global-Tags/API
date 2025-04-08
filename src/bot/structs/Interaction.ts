import { Permission } from "../../types/Permission";

export type InteractionOptions = { allowWhenBanned?: boolean, requiredPermissions?: Permission[], requireDiscordLink?: boolean };

export default abstract class Interaction {
    public allowWhenBanned: boolean;
    public requiredPermissions: Permission[];
    public requireDiscordLink: boolean;

    constructor({ allowWhenBanned = false, requiredPermissions = [], requireDiscordLink = false }: InteractionOptions) {
        this.allowWhenBanned = allowWhenBanned;
        this.requiredPermissions = requiredPermissions;
        this.requireDiscordLink = requireDiscordLink || requiredPermissions.length > 0;
    }
}