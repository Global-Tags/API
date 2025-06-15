import { HydratedDocument, model, Schema } from "mongoose";
import { isConnected } from "../mongo";

interface IStaffCategory {
    id: string;
    name: string;
    position: number;
}

export type StaffCategory = HydratedDocument<IStaffCategory>;

const schema = new Schema<IStaffCategory>({
    id: {
        type: String,
        required: true,
        unique: true
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

const staffCategories = model<IStaffCategory>('staff-categories', schema);

export async function getNextPosition(): Promise<number> {
    if(!isConnected()) return -1;
    const roles = await staffCategories.find();
    roles.sort((a, b) => a.position - b.position);
    return roles[roles.length - 1].position + 1;
}

export default staffCategories;