import { HydratedDocument, model, Schema } from "mongoose";
import { isConnected } from "../mongo";
import { generateSecureCode } from "../../libs/crypto";

interface IStaffCategory {
    /**
     * Unique identifier for the staff category
     */
    id: string;
    /**
     * Name of the staff category
     */
    name: string;
    /**
     * Position of the staff category in the list
     */
    position: number;
}

const StaffCategorySchema = new Schema<IStaffCategory>({
    id: {
        type: String,
        required: true,
        unique: true,
        default: generateSecureCode
    },
    name: {
        type: String,
        required: true
    },
    position: {
        type: Number,
        required: true
    }
});

export async function getNextPosition(): Promise<number> {
    if(!isConnected()) return -1;
    const roles = await StaffCategory.find();
    roles.sort((a, b) => a.position - b.position);
    return roles[roles.length - 1].position + 1;
}

export const StaffCategory = model<IStaffCategory>('StaffCategory', StaffCategorySchema);;
export type StaffCategoryDocument = HydratedDocument<IStaffCategory>;