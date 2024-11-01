import { model, Schema } from "mongoose";

const schema = new Schema({
    id: {
        type: String,
        required: true
    },
    sku_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    expires_at: {
        type: Date,
        required: true
    },
    done: {
        type: Boolean,
        required: true,
        default: false
    }
});

export default model('entitlements', schema)