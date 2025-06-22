import { HydratedDocument, model, Schema } from "mongoose";
import { GameProfile } from "../../libs/game-profiles";
import players, { Player } from "./players";
import { StaffCategory, StaffCategoryDocument } from "./StaffCategory";

interface IStaffMember {
    /**
     * Unique identifier for the staff member
     */
    uuid: string;
    /**
     * Optional description of the staff member
     */
    description?: string | null;
    /**
     * Category id of the staff member
     */
    category: string;
    /**
     * Date when the staff member joined
     */
    joined_at: Date;

    /**
     * Retrieves the GameProfile of the staff member
     * @return {Promise<GameProfile>} A promise that resolves to the GameProfile of the staff member
     */
    getGameProfile(): Promise<GameProfile>;

    /**
     * Retrieves the Player document associated with the staff member
     * @return {Promise<Player | null>} A promise that resolves to the Player document of the staff member, or null if not found
     */
    getPlayer(): Promise<Player | null>;

    /**
     * Retrieves the StaffCategory document associated with the staff member
     * @return {Promise<StaffCategoryDocument | null>} A promise that resolves to the StaffCategory document of the staff member, or null if not found
     */
    getCategory(): Promise<StaffCategoryDocument | null>;
}

const StaffMemberSchema = new Schema<IStaffMember>({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    category: {
        type: String,
        required: true
    },
    joined_at: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    methods: {
        getGameProfile(): Promise<GameProfile> {
            return GameProfile.getProfileByUUID(this.uuid);
        },

        getPlayer(): Promise<Player | null> {
            return players.findOne({ uuid: this.uuid });
        },

        getCategory(): Promise<StaffCategoryDocument | null> {
            return StaffCategory.findOne({ id: this.category });
        }
    }
});

export const StaffMember = model<IStaffMember>('StaffMember', StaffMemberSchema);
export type StaffMemberDocument = HydratedDocument<IStaffMember>;