import { HydratedDocument, model, Schema } from "mongoose";
import { formatUUID } from "../../game-profiles";
import { config } from "../../config";

export enum PartnerType {
    ContentCreator = 'content_creator',
}

export enum PartnerIconType {
    Skull = 'skull',
    Discord = 'discord',
    Custom = 'custom'
}

interface IPartner {
    /**
     * Player UUID of the partner
     */
    uuid: string;
    /**
     * Nice name of the partner
     */
    name: string;
    /**
     * Partner type
     */
    type: PartnerType;
    /**
     * Optional redirect URL for the partner
     */
    redirect_url: string | null;
    /**
     * Discord ID of the partner
     */
    discord_id: string;
    /**
     * The type of the partner icon
     */
    icon_type: PartnerIconType;
    /**
     * Date when the partner joined
     */
    joined_at: Date;

    /**
     * Get the URL of the partner icon
     */
    getIconUrl(): string;
}

const PartnerSchema = new Schema<IPartner>({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: Object.values(PartnerType),
        required: true
    },
    redirect_url: {
        type: String,
        default: null
    },
    discord_id: {
        type: String,
        required: true
    },
    icon_type: {
        type: String,
        enum: Object.values(PartnerIconType),
        required: true
    },
    joined_at: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    methods: {
        getIconUrl(): string {
            switch(this.icon_type) {
                case PartnerIconType.Skull:
                    return `https://laby.net/texture/profile/head/${formatUUID(this.uuid)}.png?size=256`;
                case PartnerIconType.Discord:
                    return `https://id.rappytv.com/${this.discord_id}/avatar`;
                case PartnerIconType.Custom:
                    return `${config.baseUrl}/partners/${formatUUID(this.uuid)}/icon`;
                default:
                    throw new Error(`Unexpected icon type: ${this.icon_type}`);
            }
        }
    }
});

export const Partner = model<IPartner>('Partner', PartnerSchema);
export type PartnerDocument = HydratedDocument<IPartner>;