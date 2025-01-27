import { Schema, model } from "mongoose";

const requiredNumber = {
    type: Number,
    required: true
}

interface IMetrics {
    players: number,
    tags: number,
    admins: number,
    bans: number,
    downloads: {
        flintmc: number,
        modrinth: number
    },
    ratings: {
        flintmc: number
    },
    dailyRequests: number,
    positions: Record<string, number>,
    icons: Record<string, number>,
    createdAt: Date
}

const schema = new Schema<IMetrics>({
    players: requiredNumber,
    tags: requiredNumber,
    admins: requiredNumber,
    bans: requiredNumber,
    downloads: {
        flintmc: requiredNumber,
        modrinth: requiredNumber
    },
    ratings: {
        flintmc: requiredNumber
    },
    dailyRequests: requiredNumber,
    positions: {
        type: Object,
        required: true
    },
    icons: {
        type: Object,
        required: true
    }
}, {
    timestamps: true
});

export default model<IMetrics>('metrics', schema);