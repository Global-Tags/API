import { HydratedDocument, model, Schema } from "mongoose";

interface IStaffMember {
    uuid: string;
    description?: string | null;
    category: string;
    joined_at: Date;
}

export type StaffMember = HydratedDocument<IStaffMember>;

const schema = new Schema<IStaffMember>({
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
});

const staffMembers = model<IStaffMember>('staff-members', schema);

export default staffMembers;