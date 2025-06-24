import { HydratedDocument, model, Schema } from "mongoose";
import { GlobalIcon, icons } from "../../types/GlobalIcon";
import { GlobalPosition, positions } from "../../types/GlobalPosition";
import { GameProfile } from "../../libs/game-profiles";
import { generateSecureCode } from "../../libs/crypto";

export enum PunishmentActionType {
    Banned = 'banned',
    Watched = 'watched',
    Locked = 'locked',
    Dismissed = 'dismissed'
}

export interface PunishmentAction {
    /**
     * UUID of the user who took the action
     */
    user: string;
    /**
     * Type of action taken on the punishment
     * @see PunishmentActionType
     */
    type: PunishmentActionType;
    /**
     * Additional comment provided by the user who took the action
     */
    comment: string | null;
    /**
     * Timestamp of when the action was taken
     */
    added_at: Date;
}

export interface PlayerContext {
    /**
     * The current tag of the player
     */
    tag: string;
    /**
     * The current position of the player in the global ranking
     */
    position: GlobalPosition;
    /**
     * The current icon of the player
     */
    icon: {
        /**
         * The type of the icon
         */
        type: GlobalIcon;
        /**
         * The custom icon hash, if applicable
         */
        hash: string | null;
    };
}

interface IReport {
    /**
     * Unique identifier for the report
     */
    id: string;
    /**
     * UUID of the reported user
     */
    reported_uuid: string;
    /**
     * UUID of the user who reported
     */
    reporter_uuid: string;
    /**
     * Reason for the report
     */
    reason: string;
    /**
     * Actions taken on the report
     * @see PunishmentAction
     */
    actions: PunishmentAction[];
    /**
     * Contextual information about the report
     */
    context: PlayerContext;
    /**
     * Timestamp of when the report was created
     */
    created_at: Date;
    /**
     * Timestamp of when the report was last updated
     */
    last_updated: Date;

    /**
     * Indicates if the report has been resolved
     * @return {boolean} True if the report has actions, false otherwise
     */
    isResolved(): boolean;

    /**
     * 
     * @param data - The data for the action to be performed
     * @param data.user - UUID of the user performing the action
     * @param data.type - Type of action to be performed
     * @param data.comment - Optional comment for the action
     */
    performAction(data: { user: string, type: PunishmentActionType, comment?: string | null }): PunishmentAction;

    /**
     * Fetches the GameProfile of the reporter
     * @returns {Promise<GameProfile>} The GameProfile of the reporter
     */
    getReportedProfile(): Promise<GameProfile>;

    /**
     * Fetches the GameProfile of the reported user
     * @returns {Promise<GameProfile>} The GameProfile of the reported user
     */
    getReporterProfile(): Promise<GameProfile>;
}

export const PunishmentActionSchema = new Schema<PunishmentAction>({
    user: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(PunishmentActionType),
        required: true,
    },
    comment: { type: String, required: true, default: null },
    added_at: { type: Date, required: true },
}, { _id: false });

export const ContextSchema = new Schema<PlayerContext>({
    tag: { type: String, required: true },
    position: {
        type: String,
        enum: positions,
        required: true,
    },
    icon: {
        type: {
            type: String,
            enum: icons,
            required: true,
        },
        hash: { type: String, required: true, default: null },
    },
}, { _id: false });

const ReportSchema = new Schema<IReport>({
    id: { type: String, required: true, unique: true, default: generateSecureCode },
    reported_uuid: { type: String, required: true },
    reporter_uuid: { type: String, required: true },
    reason: { type: String, required: true },
    actions: { type: [PunishmentActionSchema], default: [] },
    context: { type: ContextSchema, required: true },
    created_at: { type: Date, required: true },
    last_updated: { type: Date, required: true },
}, {
    methods: {
        isResolved(): boolean {
            return this.actions.length > 0
        },

        performAction({ user, type, comment }: { user: string, type: PunishmentActionType, comment?: string | null }): PunishmentAction {
            const action: PunishmentAction = {
                user,
                type,
                comment: comment || null,
                added_at: new Date(),
            };
            this.actions.push(action);
            return action;
        },

        getReportedProfile(): Promise<GameProfile> {
            return GameProfile.getProfileByUUID(this.reported_uuid);
        },

        getReporterProfile(): Promise<GameProfile> {
            return GameProfile.getProfileByUUID(this.reporter_uuid);
        }
    }
});

export const Report = model<IReport>('Report', ReportSchema);
export type ReportDocument = HydratedDocument<IReport>;