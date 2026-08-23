import { HydratedDocument, model, Schema, Types } from "mongoose";
import { formatUUID } from "../../game-profiles";
import { config } from "../../config";
import { createGiftCode, GiftCodeDocument, GiftType } from "./GiftCode";

const ONE_DAY = 1000 * 60 * 60 * 24;

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
     * List of gift codes the partner has created.
     */
    gift_codes: Types.ObjectId[];
    /**
     * Date when the partner joined
     */
    joined_at: Date;

    /**
     * Get the URL of the partner icon
     */
    getIconUrl(): string;

    /**
     * Create a new gift code for the partner
     */
    createGiftCode(): Promise<GiftCodeDocument>;
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
    gift_codes: {
        type: [Types.ObjectId],
        ref: 'GiftCode',
        default: []
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
        },

        async createGiftCode(): Promise<GiftCodeDocument> {
            const code = await createGiftCode({
                name: `${this.name} Partner Code`,
                maxUses: 1,
                gift: {
                    type: GiftType.Role,
                    value: 'premium',
                    duration: ONE_DAY * 31 // 31 days, a bit longer than a month
                },
                createdBy: this.uuid,
                expiresAt: new Date(Date.now() + ONE_DAY * 7) // Expires in 7 days
            });
            this.gift_codes.push(new Types.ObjectId(code._id));
            this.markModified('gift_codes');
            return code;
        }
    }
});

export const Partner = model<IPartner>('Partner', PartnerSchema);
export type PartnerDocument = HydratedDocument<IPartner>;