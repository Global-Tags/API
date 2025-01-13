import { Schema, model } from "mongoose";
import { constantCase, snakeCase } from "change-case";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";
import { Permission } from "../../types/Permission";
import { getCachedRoles, Role } from "./roles";
import { GlobalIcon } from "../../types/GlobalIcon";

export interface IPlayer {
    uuid: string,
    tag?: string | null,
    position: string,
    icon: {
        name: string,
        hash?: string | null
    },
    last_language: string,
    history: string[],
    watchlist: boolean,
    referrals: {
        has_referred: boolean,
        total: {
            uuid: string,
            timestamp: number
        }[],
        current_month: number
    },
    reports: { id: string, by: string, reported_tag: string, reason: string, created_at: Date }[],
    hide_role_icon: boolean,
    roles: {
        name: string,
        added_at: Date,
        expires_at?: Date | null,
        reason?: string | null
    }[],
    api_keys: string[],
    notes: { id: string, text: string, author: string, createdAt: Date }[],
    ban: { active: boolean, reason?: string | null, appealable: boolean, appealed: boolean, staff?: string | null },
    clears: { currentData: string, type: 'tag' | 'icon', staff: string, timestamp: number }[],
    connections: {
        discord: { id?: string | null, code?: string | null },
        email: { address?: string | null, code?: string | null }
    },
    addReferral(uuid: string): void,
    isEmailVerified(): boolean,
    getRoles(): Role[],
    hasPermission(permission: Permission): boolean,
    canManagePlayers(): boolean,
    isBanned(): boolean,
    banPlayer(reason: string, staff: string, appealable?: boolean): void,
    unban(): void,
    clearTag(staff: string): void,
    clearIcon(staff: string): void,
    createNote({ text, author }: { text: string, author: string }): void,
    existsNote(id: string): boolean,
    deleteNote(id: string): void,
    createReport({ by, reported_tag, reason }: { by: string, reported_tag: string, reason: string }): void,
    deleteReport(id: string): void
}

const schema = new Schema<IPlayer>({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    tag: {
        type: String,
        default: null
    },
    position: {
        type: String,
        required: true,
        default: 'above'
    },
    icon: {
        name: {
            type: String,
            required: true,
            default: 'none'
        },
        hash: String
    },
    last_language: {
        type: String,
        required: true,
        default: 'en_us'
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
    referrals: {
        has_referred: {
            type: Boolean,
            required: true,
            default: false
        },
        total: {
            type: [{
                uuid: {
                    type: String,
                    required: true
                },
                timestamp: {
                    type: Number,
                    required: true
                }
            }],
            required: true,
            default: []
        },
        current_month: {
            type: Number,
            required: true,
            default: 0
        }
    },
    reports: {
        type: [{
            id: {
                type: String,
                required: true
            },
            by: {
                type: String,
                required: true
            },
            reported_tag: {
                type: String,
                required: true
            },
            reason: {
                type: String,
                required: true
            },
            created_at: {
                type: Date,
                required: true
            }
        }],
        required: true,
        default: []
    },
    hide_role_icon: {
        type: Boolean,
        required: true,
        default: false
    },
    roles: {
        type: [{
            name: {
                type: String,
                required: true
            },
            added_at: {
                type: Date,
                required: true
            },
            expires_at: Date,
            reason: String
        }],
        required: true,
        default: []
    },
    api_keys: {
        type: [String],
        required: true,
        default: []
    },
    notes: [{
        id: {
            type: String,
            required: true
        },
        text: {
            type: String,
            required: true
        },
        author: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            required: true
        }
    }],
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
        },
        staff: String
    },
    clears: [{
        currentData: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['tag', 'icon'],
            required: true
        },
        staff: {
            type: String,
            required: true
        },
        timestamp: {
            type: Number,
            required: true
        }
    }],
    connections: {
        discord: {
            id: String,
            code: String
        },
        email: {
            address: String,
            code: String
        }
    }
}, {
    methods: {
        addReferral(uuid: string) {
            this.referrals.total.push({ uuid, timestamp: Date.now() });
            this.referrals.current_month++;
        },

        isEmailVerified() {
            return this.connections.email.address && !this.connections.email.code;
        },

        getRoles(): Role[] {
            return getCachedRoles().filter(({ name: role }) => {
                role = snakeCase(role);
                const playerRole = this.roles.find((playerRole) => snakeCase(playerRole.name) == role);
                return playerRole && (!playerRole.expires_at || playerRole.expires_at.getTime() > Date.now());
            });
        },

        hasPermission(permission: Permission) {
            return this.getRoles().some((role) => role.hasPermission(permission));
        },

        canManagePlayers() {
            return this.getRoles().some((role) => [
                Permission.ManageBans,
                Permission.ManageNotes,
                Permission.ManageRoles,
                Permission.ManageTags,
                Permission.ManageWatchlist
            ].some((permission) => role.hasPermission(permission)));
        },

        isBanned(): boolean {
            return this.ban?.active || false;
        },

        banPlayer(reason: string, staff: string, appealable: boolean = true) {
            this.ban.active = true;
            this.ban.reason = reason;
            this.ban.appealable = appealable;
            this.ban.appealed = false;
            this.ban.staff = staff;
        },

        unban() {
            this.ban.active = false;
            this.ban.reason = null;
            this.ban.appealable = true;
            this.ban.appealed = false;
            this.ban.staff = null;
        },

        clearTag(staff: string) {
            this.clears.push({
                currentData: this.tag || '--',
                type: 'tag',
                staff,
                timestamp: new Date().getTime()
            })
            this.tag = null;
        },

        clearIconTexture(staff: string) {
            this.clears.push({
                currentData: this.icon.hash || '--',
                type: 'icon',
                staff,
                timestamp: new Date().getTime()
            })
            this.icon.name = constantCase(GlobalIcon[GlobalIcon.None]);
            this.icon.hash = null;
        },

        createNote({ text, author }: { text: string, author: string }) {
            this.notes.push({
                id: generateSecureCode(),
                text,
                author,
                createdAt: new Date()
            });
        },

        existsNote(id: string) {
            this.notes.some((note) => note.id == id);
        },

        deleteNote(id: string) {
            this.notes = this.notes.filter((note) => note.id != id);
        },

        createReport({ by, reported_tag, reason }: { by: string, reported_tag: string, reason: string }) {
            this.reports.push({
                id: generateSecureCode(),
                by,
                reported_tag,
                reason,
                created_at: new Date()
            })
        },

        deleteReport(id: string) {
            this.reports = this.reports.filter((report) => report.id != id);
        }
    }
});

export default model<IPlayer>('players', schema);