import { HydratedDocument, Schema, model } from "mongoose";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { generateSecureCode } from "../../libs/crypto";

export enum GiftType {
    Role = 'role'
}

interface IGiftCode {
    /**
     * Unique identifier for the gift code
     */
    id: string;
    /**
     * Name of the gift code
     */
    name: string;
    /**
     * The actual code that users will enter to redeem the gift
     */
    code: string;
    /**
     * List of UUIDs that have used this gift code
     */
    uses: string[];
    /**
     * Maximum number of times this code can be used
     */
    max_uses: number;
    /**
     * The gift that this code provides
     */
    gift: {
        /**
         * Type of gift being provided
         */
        type: GiftType,
        /**
         * Value of the gift, e.g., role id
         */
        value: string,
        /**
         * Duration for which the gift is valid, in milliseconds
         * If null, the gift is permanent
         */
        duration?: number | null
    };
    /**
     * UUID of the user who created this gift code
     */
    created_by: string;
    /**
     * Timestamp when the gift code was created
     */
    created_at: Date;
    /**
     * Optional expiration date for the gift code
     * If null, the code does not expire
     */
    expires_at?: Date | null;

    /**
     * Get the GameProfile of the creator of this gift code
     * @return {Promise<GameProfile>} The GameProfile of the creator
     */
    getCreatorProfile(): Promise<GameProfile>;

    /**
     * Check if the gift code is still valid
     * @return {boolean} True if the code can still be used, false otherwise
     */
    isValid(): boolean;

    /**
     * Calculate how many uses are left for this gift code
     * @return {number} The number of uses left
     */
    usesLeft(): number;
}

const GiftCodeSchema = new Schema<IGiftCode>({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    uses: {
        type: [String],
        required: true
    },
    max_uses: {
        type: Number,
        required: true
    },
    gift: {
        type: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            required: false
        }
    },
    created_by: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        required: true
    },
    expires_at: {
        type: Date,
        required: false
    }
}, {
    methods: {
        getCreatorProfile(): Promise<GameProfile> {
            return GameProfile.getProfileByUUID(this.created_by);
        },
        
        isValid(): boolean {
            return this.uses.length < this.max_uses && (!this.expires_at || this.expires_at > new Date());
        },

        usesLeft(): number {
            return this.max_uses - this.uses.length;
        }
    }
});

export async function createGiftCode({
    name,
    code = generateSecureCode(12),
    maxUses,
    gift,
    expiresAt,
    createdBy
} : {
    name: string,
    code?: string,
    maxUses: number,
    gift: IGiftCode['gift'],
    expiresAt?: Date | null,
    createdBy: string
}): Promise<GiftCodeDocument> {
    return await GiftCode.insertOne({
        id: generateSecureCode(),
        name,
        code,
        uses: [],
        max_uses: maxUses,
        gift: gift,
        created_by: stripUUID(createdBy),
        created_at: new Date(),
        expires_at: expiresAt || null
    });
}

export const GiftCode = model<IGiftCode>('GiftCode', GiftCodeSchema);
export type GiftCodeDocument = HydratedDocument<IGiftCode>;