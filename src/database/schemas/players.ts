import { Schema, model } from "mongoose";
import { snakeCase } from "change-case";
import { generateSecureCode } from "../../routes/players/[uuid]/connections";
import { Permission } from "../../types/Permission";
import { getCachedRoles, Role } from "./roles";
import { GlobalIcon } from "../../types/GlobalIcon";

export type PlayerRole = {
    role: Role,
    added_at: Date,
    manually_added: boolean,
    expires_at?: Date | null,
    reason?: string | null
}

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
        manually_added: boolean,
        expires_at?: Date | null,
        reason?: string | null
    }[],
    api_keys: {
        name: string,
        key: string,
        created_at: Date,
        last_used?: Date | null
    }[],
    notes: { id: string, text: string, author: string, createdAt: Date }[],
    bans: {
        appealable: boolean,
        appealed: boolean,
        banned_at: Date,
        expires_at: Date | null,
        id: string,
        reason: string,
        staff: string
    }[],
    clears: { currentData: string, type: 'tag' | 'icon', staff: string, timestamp: number }[],
    connections: {
        discord: { id?: string | null, code?: string | null },
        email: { address?: string | null, code?: string | null }
    },
    addReferral(uuid: string): void,
    isEmailVerified(): boolean,
    getRoles(): PlayerRole[],
    hasPermission(permission: Permission): boolean,
    canManagePlayers(): boolean,
    isBanned(): boolean,
    banPlayer({ reason, staff, appealable, expiresAt }: { reason: string, staff: string, appealable?: boolean, expiresAt?: Date | null }): void,
    unban(): void,
    clearTag(staff: string): void,
    clearIcon(staff: string): void,
    createApiKey(name: string): string,
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
            manually_added: {
                type: Boolean,
                required: true
            },
            expires_at: Date,
            reason: String
        }],
        required: true,
        default: []
    },
    api_keys: {
        type: [{
            name: {
                type: String,
                required: true
            },
            key: {
                type: String,
                required: true
            },
            created_at: {
                type: Date,
                required: true
            },
            last_used: Date
        }],
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
    bans: [{
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
        banned_at: {
            type: Date,
            required: true,
            default: Date.now
        },
        expires_at: {
            type: Date,
            required: false
        },
        id: {
            type: String,
            required: true
        },
        reason: {
            type: String,
            required: true
        },
        staff: {
            type: String,
            required: true
        }
    }],
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

        getRoles(): PlayerRole[] {
            return getCachedRoles().filter(({ name: role }) => {
                role = snakeCase(role);
                const playerRole = this.roles.find((playerRole) => snakeCase(playerRole.name) == role);
                return playerRole && (!playerRole.expires_at || playerRole.expires_at.getTime() > Date.now());
            }).map((role) => {
                const name = snakeCase(role.name);
                const playerRole = this.roles.find((playerRole) => snakeCase(playerRole.name) == name)!;

                return {
                    role,
                    added_at: playerRole.added_at,
                    manually_added: playerRole.manually_added,
                    expires_at: playerRole.expires_at,
                    reason: playerRole.reason
                }
            });
        },

        hasPermission(permission: Permission): boolean {
            return this.getRoles().some((role) => role.role.hasPermission(permission));
        },

        canManagePlayers(): boolean {
            return [
                Permission.ManageBans,
                Permission.ManageNotes,
                Permission.ManageRoles,
                Permission.ManageTags,
                Permission.ManageWatchlist
            ].some((permission) => this.hasPermission(permission));
        },

        isBanned(): boolean {
            const ban = this.bans.at(0);
            return !!ban && (!ban.expires_at || ban.expires_at.getTime() > Date.now());
        },

        banPlayer({ reason, staff, appealable = true, expiresAt }: { reason: string, staff: string, appealable?: boolean, expiresAt?: Date | null }) {
            this.bans.unshift({
                appealable,
                appealed: false,
                banned_at: new Date(),
                expires_at: expiresAt || null,
                id: generateSecureCode(),
                reason,
                staff
            });
        },

        unban() {
            const ban = this.bans.at(0);
            if(ban) ban.expires_at = new Date();
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
            this.icon.name = snakeCase(GlobalIcon[GlobalIcon.None]);
            this.icon.hash = null;
        },

        createApiKey(name: string): string {
            const key = `sk_${generateSecureCode(32)}`;
            
            this.api_keys.push({
                name,
                key: key,
                created_at: new Date(),
                last_used: null
            });

            return key;
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