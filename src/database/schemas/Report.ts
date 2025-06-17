import { HydratedDocument, model, Schema } from "mongoose";
import { GlobalIcon } from "../../types/GlobalIcon";
import { GlobalPosition } from "../../types/GlobalPosition";
import { GameProfile } from "../../libs/game-profiles";

export enum ReportActionType {
    Banned = 'banned',
    Watched = 'watched',
    Dismissed = 'dismissed'
}

export interface ReportAction {
    /**
     * UUID of the user who took the action
     */
    user: string;
    /**
     * Type of action taken on the report
     */
    type: ReportActionType;
    /**
     * Additional comment provided by the user who took the action
     */
    comment: string | null;
    /**
     * Timestamp of when the action was taken
     */
    added_at: Date;
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
     */
    actions: ReportAction[];
    /**
     * Contextual information about the report
     */
    context: {
        /**
         * The current tag of the reported user
         */
        tag: string;
        /**
         * The current tag position of the reported user
         */
        position: GlobalPosition;
        /**
         * The current icon of the reported user
         */
        icon: {
            /**
             * The icon type
             */
            type: GlobalIcon;
            /**
             * The custom icon hash, if applicable
             */
            hash: string | null;
        };
    };
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
    performAction(data: { user: string, type: ReportActionType, comment?: string | null }): ReportAction;

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

const ReportActionSchema = new Schema<ReportAction>({
    user: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(ReportActionType),
        required: true,
    },
    comment: { type: String, required: true, default: null },
    added_at: { type: Date, required: true },
}, { _id: false });

const ReportSchema = new Schema<IReport>({
    id: { type: String, required: true, unique: true },
    reported_uuid: { type: String, required: true },
    reporter_uuid: { type: String, required: true },
    reason: { type: String, required: true },
    actions: { type: [ReportActionSchema], default: [] },

    context: {
        tag: { type: String, required: true },
        position: {
            type: String,
            enum: Object.values(GlobalPosition),
            required: true,
        },
        icon: {
            type: {
                type: String,
                enum: Object.values(GlobalIcon),
                required: true,
            },
            hash: { type: String, required: true, default: null },
        },
    },
    created_at: { type: Date, required: true },
    last_updated: { type: Date, required: true },
}, {
    methods: {
        isResolved(): boolean {
            return this.actions.length > 0
        },

        performAction({ user, type, comment }: { user: string, type: ReportActionType, comment?: string | null }): ReportAction {
            const action: ReportAction = {
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