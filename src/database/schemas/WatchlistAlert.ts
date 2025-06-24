import { HydratedDocument, model, Schema } from "mongoose";
import { ContextSchema, PlayerContext, PunishmentAction, PunishmentActionSchema } from "./Report";

interface IWatchlistAlert {
    /**
     * Unique identifier for the watchlist alert
     */
    id: string;
    /**
     * UUID of the player who is being watched
     */
    player_uuid: string;
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
}

const WatchlistAlertSchema = new Schema<IWatchlistAlert>({
    id: { type: String, required: true, unique: true },
    player_uuid: { type: String, required: true },
    context: ContextSchema,
    new: { type: Boolean, required: true },
    actions: [PunishmentActionSchema],
    created_at: { type: Date, default: Date.now }
});

export const WatchlistAlert = model<IWatchlistAlert>('WatchlistAlert', WatchlistAlertSchema);
export type WatchlistAlertDocument = HydratedDocument<IWatchlistAlert>;