import { HydratedDocument, Schema, model } from "mongoose";
import { GlobalPosition } from "../../types/GlobalPosition";
import { GlobalIcon } from "../../types/GlobalIcon";

const requiredNumber = {
    type: Number,
    required: true
}

interface IMetrics {
    /**
     * Total number of registered players
     */
    players: number,
    /**
     * Total number of tags
     */
    tags: number,
    /**
     * Total number of staff members with admin permissions
     */
    admins: number,
    /**
     * Total number of banned players
     */
    bans: number,
    /**
     * Total number of downloads from modding platforms
     */
    downloads: {
        /**
         * Total downloads from FlintMC
         */
        flintmc: number,
        /**
         * Total downloads from Modrinth
         */
        modrinth: number
    },
    /**
     * Total number of ratings on modding platforms
     */
    ratings: {
        /**
         * Total ratings on FlintMC
         */
        flintmc: number
    },
    /**
     * Total number of requests made to the API in the last 24 hours
     */
    daily_requests: number,
    /**
     * Most used tag positions
     * Key: Position, Value: Number of tags in that position
     * @see GlobalPosition
     */
    positions: Record<GlobalPosition, number>,
    /**
     * Most used icons
     * Key: Icon, Value: Number of tags using that icon
     * @see GlobalIcon
     */
    icons: Record<GlobalIcon, number>,
    /**
     * Timestamp when the metrics were created
     */
    created_at: Date
}

const MetricSchema = new Schema<IMetrics>({
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
    daily_requests: requiredNumber,
    positions: {
        type: Object,
        required: true
    },
    icons: {
        type: Object,
        required: true
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
});

export const Metric = model<IMetrics>('Metric', MetricSchema);
export type MetricDocument = HydratedDocument<IMetrics>;