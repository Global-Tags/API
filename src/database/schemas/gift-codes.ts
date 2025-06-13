import { HydratedDocument, Schema, model as createModel } from "mongoose";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";
import { GameProfile, stripUUID } from "../../libs/game-profiles";

export interface IGiftCode {
    id: string;
    name: string;
    code: string;
    uses: string[];
    max_uses: number;
    gift: {
        type: 'role',
        value: string,
        duration?: number | null
    };
    created_by: string;
    created_at: Date;
    expires_at?: Date | null;
    getCreatorProfile(): Promise<GameProfile>;
    isValid(): boolean;
    usesLeft(): number;
}
export type GiftCode = HydratedDocument<IGiftCode>;

const schema = new Schema<IGiftCode>({
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

const model = createModel<IGiftCode>('gift-codes', schema);

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
}): Promise<GiftCode> {
    return await model.insertOne({
        id: generateSecureCode(12),
        name,
        code,
        uses: [],
        max_uses: maxUses,
        gift: gift,
        created_by: stripUUID(createdBy),
        created_at: new Date(),
        expires_at: expiresAt || null
    });;
}

export default model;