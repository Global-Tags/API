import { Schema, model } from "mongoose";

export enum Role {
    ADMIN,
    DEVELOPER,
    MODERATOR,
    SUPPORTER
}

const schema = new Schema({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    tag: String,
    position: {
        type: String,
        enum: [`ABOVE`, `BELOW`, `RIGHT`, `LEFT`],
        required: true,
        default: `ABOVE`
    },
    icon: {
        type: String,
        required: true,
        default: `NONE`
    },
    history: {
        type: [String],
        required: true,
        default: []
    },
    watchlist: {
        type: Boolean,
        required: true,
        default: false
    },
    reports: {
        type: [
            {
                by: String,
                reportedName: String,
                reason: String
            }
        ],
        required: true,
        default: []
    },
    roles: {
        type: [String],
        required: true,
        default: []
    },
    ban: {
        active: {
            type: Boolean,
            required: true,
            default: false
        },
        reason: String,
        appealable: {
            type: Boolean,
            required: true,
            default: true
        },
        appealed: {
            type: Boolean,
            required: true,
            default: false
        }
    },
    connections: {
        discord: {
            id: String,
            code: String
        }
    }
}, {
    methods: {
        isAdmin(): boolean {
            return this.roles.includes(Role[Role.ADMIN]);
        },

        isBanned(): boolean {
            return this.ban?.active || false;
        },

        banPlayer(reason: string, appealable: boolean = true) {
            this.ban!.active = true;
            this.ban!.reason = reason;
            this.ban!.appealable = appealable;
            this.ban!.appealed = false;
        },

        unban() {
            this.ban!.active = false;
            this.ban!.reason = null;
            this.ban!.appealable = true;
            this.ban!.appealed = false;
        }
    }
});

export default model('players', schema);