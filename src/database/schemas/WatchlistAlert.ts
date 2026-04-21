import { HydratedDocument, model, Schema } from "mongoose";
import { ContextSchema, PlayerContext, PunishmentAction, PunishmentActionSchema } from "./Report";
import { generateDocumentId } from "../../libs/crypto";
import { Player, WatchlistPeriod } from "./Player";

interface IWatchlistAlert {
    /**
     * Unique identifier for the watchlist alert
     */
    id: string;
    /**
     * UUID of the player who is being watched
     */
    player_uuid: string;
    period: string;
    /**
     * Contextual information about the player at the time of the alert
     * @see PlayerContext
     */
    context: PlayerContext;
    /**
     * If the alert has put the player on the watchlist
     */
    new: boolean;
    /**
     * Actions taken on the watchlist alert
     * @see PunishmentAction
     */
    actions: PunishmentAction[];
    /**
     * Timestamp of when the alert was created
     */
    created_at: Date;

    /**
     * Get the watchlist period for the alert
     * @returns The watchlist period for the alert
     */
    getWatchlistPeriod(): Promise<WatchlistPeriod | null>;
}

const WatchlistAlertSchema = new Schema<IWatchlistAlert>({
    id: {
        type: String,
        required: true,
        unique: true,
        default: generateDocumentId
    },
    player_uuid: {
        type: String,
        required: true
    },
    period: {
        type: String,
        required: true
    },
    context: {
        type: ContextSchema,
        required: true
    },
    new: {
        type: Boolean,
        required: true
    },
    actions: {
        type: [PunishmentActionSchema],
        required: true,
        default: []
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    methods: {
        async getWatchlistPeriod(): Promise<WatchlistPeriod | null> {
            const player = await Player.findOne({ 'watchlist_periods.id': this.period }).lean();
            return player ? player.watchlist_periods.find(period => period.id === this.period) || null : null;
        }
    }
});

export const WatchlistAlert = model<IWatchlistAlert>('WatchlistAlert', WatchlistAlertSchema);
export type WatchlistAlertDocument = HydratedDocument<IWatchlistAlert>;