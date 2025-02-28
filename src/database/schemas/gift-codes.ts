import { HydratedDocument, Schema, model as createModel } from "mongoose";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";

export interface IGiftCode {
    name: string,
    code: string,
    uses: string[],
    max_uses: number,
    gift: {
        type: 'role',
        value: string,
        duration?: number | null
    },
    created_at: Date,
    expires_at?: Date | null,
    isValid(): boolean
}
export type GiftCode = HydratedDocument<IGiftCode>;

const schema = new Schema<IGiftCode>({
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
        isValid() {
            return this.uses.length < this.max_uses && (!this.expires_at || this.expires_at > new Date());
        }
    }
});

const model = createModel<IGiftCode>('gift-codes', schema);

export async function createGiftCode({
    name,
    maxUses,
    gift,
    expiresAt
} : {
    name: string,
    maxUses: number,
    gift: IGiftCode['gift'],
    expiresAt?: Date | null
}): Promise<string> {
    const code = await model.insertOne({
        name,
        code: generateSecureCode(12),
        uses: [],
        max_uses: maxUses,
        gift: gift,
        created_at: new Date(),
        expires_at: expiresAt || null
    });

    return code.code;
}

export default model;