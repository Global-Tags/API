import { HydratedDocument, Schema, model } from "mongoose";
import { snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { getCachedRoles, Role } from "./roles";
import { GlobalIcon } from "../../types/GlobalIcon";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { isConnected } from "../mongo";
import { generateSecureCode } from "../../libs/crypto";

export type PlayerRole = {
    role: Role,
    added_at: Date,
    autoRemove: boolean,
    expiresAt?: Date | null,
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
        auto_remove: boolean,
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
        appeal: {
            appealable: boolean,
            appealed: boolean,
            reason?: string | null,
            appealed_at?: Date | null
        },
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
    getGameProfile(): Promise<GameProfile>,
    getReferrer(): Promise<Player | null>
    addReferral(uuid: string): void,
    isEmailVerified(): boolean,
    getAllRoles(): PlayerRole[],
    getActiveRoles(): PlayerRole[],
    getRole(role: string): PlayerRole | null,
    addRole(info: { name: string, reason: string, autoRemove: boolean, expiresAt?: Date | null, duration?: number | null }): { success: boolean, expiresAt: Date | null },
    setRoleExpiration(name: string, expiration: Date | null): boolean,
    setRoleNote(name: string, note: string | null): boolean,
    removeRole(role: string): boolean,
    hasPermission(permission: Permission): boolean,
    canManagePlayers(): boolean,
    isBanned(): boolean,
    banPlayer({ reason, staff, appealable, expiresAt }: { reason: string, staff: string, appealable?: boolean, expiresAt?: Date | null }): void,
    unban(): void,
    clearTag(staff: string): void,
    clearIconTexture(staff: string): void,
    createApiKey(name: string): string,
    createNote({ text, author }: { text: string, author: string }): void,
    existsNote(id: string): boolean,
    deleteNote(id: string): void,
    createReport({ by, reported_tag, reason }: { by: string, reported_tag: string, reason: string }): void,
    deleteReport(id: string): void
}

export type Player = HydratedDocument<IPlayer>;

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
            auto_remove: {
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
        appeal: {
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
            reason: {
                type: String,
                required: false
            },
            appealed_at: {
                type: Date,
                required: false
            }
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
        async getGameProfile(): Promise<GameProfile> {
            return await GameProfile.getProfileByUUID(this.uuid);
        },

        async getReferrer(): Promise<Player | null> {
            if(!this.referrals.has_referred) return null;
            const referrer = await this.model('players').findOne({ 'referrals.total.uuid': this.uuid });
            return referrer as Player | null;
        },

        addReferral(uuid: string) {
            this.referrals.total.push({ uuid, timestamp: Date.now() });
            this.referrals.current_month++;
        },

        isEmailVerified() {
            return this.connections.email.address && !this.connections.email.code;
        },

        getAllRoles(): PlayerRole[] {
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
                    autoRemove: playerRole.auto_remove,
                    expires_at: playerRole.expires_at,
                    reason: playerRole.reason
                }
            });
        },

        getActiveRoles(): PlayerRole[] {
            return this.getAllRoles().filter((role) => role.expiresAt == null || role.expiresAt.getTime() > Date.now());
        },

        getRole(role: string): PlayerRole | null {
            role = snakeCase(role);
            return this.getActiveRoles().find((playerRole) => playerRole.role.name == role) || null;
        },

        addRole({ name, reason, autoRemove, expiresAt, duration }: { name: string, reason: string, autoRemove: boolean, expiresAt?: Date | null, duration?: number | null }): { success: boolean, expiresAt: Date | null } {
            name = snakeCase(name);
            const role = this.roles.find((playerRole) => playerRole.name == name);
            if(role) {
                if(!role.expires_at) return { success: false, expiresAt: null };
                if(role.expires_at.getTime() > Date.now()) {
                    role.reason += ` | ${reason}`;
                    role.auto_remove = autoRemove;
                    role.expires_at = expiresAt ? expiresAt : duration ? new Date(role.expires_at.getTime() + duration) : null;
                    return { success: true, expiresAt: role.expires_at };
                } else {
                    role.reason = reason;
                    role.auto_remove = autoRemove;
                    role.expires_at = expiresAt ? expiresAt : duration ? new Date(Date.now() + duration) : null;
                    return { success: true, expiresAt: role.expires_at };
                }
            } else {
                const role = {
                    name,
                    reason,
                    added_at: new Date(),
                    auto_remove: autoRemove,
                    expires_at: expiresAt ? expiresAt : duration ? new Date(Date.now() + duration) : null
                };
                this.roles.push(role);
                return { success: true, expiresAt: role.expires_at };
            }
        },

        setRoleExpiration(name: string, expiration: Date | null): boolean {
            const role = this.roles.find((role) => role.name == name);
            if(!role) return false;
            role.expires_at = expiration;
            return true;
        },

        setRoleNote(name: string, note: string): boolean {
            const role = this.roles.find((role) => role.name == name);
            if(!role) return false;
            role.reason = note;
            return true;
        },

        removeRole(role: string): boolean {
            role = snakeCase(role);
            const playerRole = this.roles.find((playerRole) => playerRole.name == role);
            if(!playerRole) return false;
            playerRole.expires_at = new Date();
            return true;
        },

        hasPermission(permission: Permission): boolean {
            return this.getActiveRoles().some((role) => role.role.hasPermission(permission));
        },

        canManagePlayers(): boolean {
            return [
                Permission.ViewBans,
                Permission.ViewApiKeys,
                Permission.ViewConnections,
                Permission.ViewNotes,
                Permission.ViewReports,
                Permission.ViewRoles,
                Permission.ManagePlayerTags,
                Permission.ManageWatchlistEntries
            ].some((permission) => this.hasPermission(permission));
        },

        isBanned(): boolean {
            const ban = this.bans.at(0);
            return !!ban && (!ban.expires_at || ban.expires_at.getTime() > Date.now());
        },

        banPlayer({ reason, staff, appealable = true, expiresAt }: { reason: string, staff: string, appealable?: boolean, expiresAt?: Date | null }) {
            this.bans.unshift({
                appeal: {
                    appealable,
                    appealed: false,
                    reason: null,
                    appealed_at: null
                },
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

const players = model<IPlayer>('players', schema);

export async function getOrCreatePlayer(uuid: string): Promise<Player> {
    uuid = stripUUID(uuid);
    const player = await players.findOne({ uuid });
    if(player) return player;
    return await players.create({ uuid });
}

export async function resetMonthlyReferrals() {
    if(!isConnected()) return;
    const data = await players.find({ 'referrals.current_month': { $gt: 0 } });

    for(const player of data) {
        player.referrals.current_month = 0;
        player.save();
    }
}

export default players;