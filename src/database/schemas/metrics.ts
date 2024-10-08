import { Schema, model } from "mongoose";

const requiredNumber = {
    type: Number,
    required: true
}

const schema = new Schema({
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

export default model('metrics', schema);