import { HydratedDocument, Schema, model } from "mongoose";
import { snakeCase } from "change-case";
import { Permission } from "../../types/Permission";
import { getCachedRoles, RoleDocument } from "./Role";
import { GlobalIcon, icons } from "../../types/GlobalIcon";
import { GameProfile, stripUUID } from "../../libs/game-profiles";
import { isConnected } from "../mongo";
import { generateSecureCode } from "../../libs/crypto";
import { Report, ReportDocument } from "./Report";
import { GlobalPosition, positions } from "../../types/GlobalPosition";

export interface PlayerRole {
    /**
     * The role document containing the role information
     * @see RoleDocument
     */
    role: RoleDocument;
    /**
     * The reason for assigning the role to the player
     * Can be null if no reason was provided
     */
    reason: string | null;
    /**
     * Whether the role is set to auto-remove after expiration
     */
    autoRemove: boolean;
    /**
     * Whether the role icon should be hidden
     */
    visible: boolean;
    /**
     * The date when the role was added to the player
     */
    addedAt: Date;
    /**
     * The expiration date of the role, if applicable
     * If null, the role does not expire
     */
    expiresAt: Date | null;
}

export interface HistoryEntry {
    /**
     * The tag content or icon hash that was set
     */
    content: string;
    /**
     * The timestamp when the tag or icon was set
     */
    timestamp: Date;
}

export interface ApiKey {
    /**
     * Unique identifier for the API key
     */
    id: string;
    /**
     * Name of the API key, used for identification
     */
    name: string;
    /**
     * The actual key string used for authentication
     */
    key: string;
    /**
     * The date when the API key was created
     */
    created_at: Date;
    /**
     * The date when the API key was last used
     * Can be null if it has never been used
     */
    last_used: Date | null;
}

export interface PlayerNote {
    /**
     * Unique identifier for the note
     */
    id: string;
    /**
     * The content of the note
     */
    content: string;
    /**
     * The UUID of the player who created the note
     */
    author: string;
    /**
     * The date when the note was created
     */
    created_at: Date;
}

export interface DataClear {
    /**
     * The current value of the cleared data, such as tag or icon hash
     */
    current_value: string;
    /**
     * The reason for clearing the data
     */
    reason: string;
    /**
     * The type of data that was cleared, either 'tag' or 'icon'
     */
    type: 'tag' | 'icon';
    /**
     * The timestamp when the data was cleared
     */
    staff: string;
    /**
     * The date when the data was cleared
     */
    cleared_at: Date;
}

export enum AccountLockType {
    ChangeTag = 'change_tag',
    ChangePosition = 'change_position',
    ChangeIcon = 'change_icon',
    UploadCustomIcon = 'upload_custom_icon',
    ReportPlayers = 'report_players'
}

export interface AccountLock {
    /**
     * Unique identifier for the account lock
     */
    id: string;
    /**
     * The type of lock applied to the account
     * This determines what actions are restricted
     * @see AccountLockType
     */
    type: AccountLockType;
    /**
     * The reason for applying the lock
     */
    reason: string;
    /**
     * The UUID of the staff member who applied the lock
     */
    staff: string;
    /**
     * The date when the lock was applied
     */
    locked_at: Date;
    /**
     * The date when the lock expires, if applicable
     * If null, the lock does not expire
     */
    expires_at: Date | null;
}

export interface WatchlistPeriod {
    /**
     * Unique identifier for the watchlist period
     */
    id: string;
    /**
     * The reason for the watchlist entry
     */
    reason: string;
    /**
     * The UUID of the staff member who added the player to the watchlist
     */
    staff: string;
    /**
     * The date when the player was added to the watchlist
     */
    watched_at: Date;
    /**
     * The date when the watchlist entry expires, if applicable
     * If null, the watchlist entry does not expire
     */
    expires_at: Date | null;
}

export interface PlayerBan {
    /**
     * Unique identifier for the ban
     */
    id: string;
    /**
     * The reason for the ban
     */
    reason: string;
    /**
     * The UUID of the staff member who issued the ban
     */
    staff: string;
    /**
     * The date when the player was banned
     */
    banned_at: Date;
    /**
     * The date when the ban expires, if applicable
     * If null, the ban does not expire
     */
    expires_at: Date | null;
    /**
     * Information about the appeal status of the ban
     */
    appeal: {
        /**
         * Whether the ban is appealable
         */
        appealable: boolean;
        /**
         * Whether the player has appealed the ban
         */
        appealed: boolean;
        /**
         * The reason for the appeal, if applicable
         * Can be null if no appeal was made
         */
        reason: string | null;
        /**
         * The date when the appeal was made, if applicable
         * Can be null if no appeal was made
         */
        appealed_at: Date | null;
    };
}

interface IPlayer {
    /**
     * The UUID of the player
     */
    uuid: string;
    email: {
        address: string | null;
        last_changed_at: Date | null;
        verification_code: string | null;
        verification_expires_at: Date | null;
        verified: boolean;
    };
    /**
     * The preferred language of the player, defaults to 'en_us'
     */
    preferred_language: string;
    /**
     * The tag of the player, can be null if not set
     */
    tag: string | null;
    /**
     * The position of the tag
     */
    position: GlobalPosition;
    /**
     * The icon of the player, containing the name and possibly a hash for custom icons
     */
    icon: {
        /**
         * The name of the icon, can be a global icon or a custom one
         */
        type: GlobalIcon;
        /**
         * The hash of the custom icon, if applicable
         */
        hash: string | null;
    };
    /**
     * The history of the player's tag changes, containing content and timestamp
     */
    tag_history: HistoryEntry[];
    /**
     * The history of the player's icon changes, containing hash and timestamp
     * This is used to track custom icon changes
     */
    custom_icon_history: HistoryEntry[];
    /**
     * The referral information of the player
     */
    referrals: {
        /**
         * All referrals made by the player, containing UUID and timestamp
         */
        total: {
            uuid: string;
            referred_at: number;
        }[];
        /**
         * The current month referrals count
         */
        current_month: number;
    };
    /**
     * The roles assigned to the player, containing role information
     */
    roles: {
        id: string;
        auto_remove: boolean;
        reason: string | null;
        visible: boolean;
        added_at: Date;
        expires_at: Date | null;
    }[];
    /**
     * The API keys associated with the player, containing key information
     */
    api_keys: ApiKey[];
    /**
     * The staff notes created on the player, containing note information
     */
    notes: PlayerNote[];
    /**
     * The data clears performed on the player, containing clear information
     */
    clears: DataClear[];
    /**
     * The locks applied to the player, containing lock information
     */
    locks: AccountLock[];
    /**
     * The watchlist periods of the player, containing watchlist information
     */
    watchlist_periods: WatchlistPeriod[];
    /**
     * The bans applied to the player, containing ban information
     */
    bans: PlayerBan[];
    /**
     * Connections to external services, such as Discord or Twitch
     */
    connections: {
        /**
         * Discord connection information, containing ID and tokens
         * Can be null if the player is not connected to Discord
         */
        discord: { // TODO: Implement routes
            /**
             * The Discord user ID of the player
             */
            id: string;
            /**
             * The Discord OAuth2 code for authentication
             */
            access_token: string;
            /**
             * The expiration date of the Discord access token
             */
            access_expiration: Date;
            /**
             * The refresh token for the Discord OAuth2 authentication
             */
            refresh_token: string;
        } | null;
        // TODO: Add twitch connection
    };

    /**
     * Get the player's GameProfile
     * @return {Promise<GameProfile>} A promise that resolves to the GameProfile of the player
     */
    getGameProfile(): Promise<GameProfile>;

    //* API Keys

    /**
     * 
     * @param name The name of the API key to create
     * @returns The created API key object
     */
    createApiKey(name: string): ApiKey;

    /**
     * 
     * @param id The ID of the API key to retrieve
     * @returns The API key object if found, otherwise null
     */
    getApiKey(id: string): ApiKey | null;

    /**
     * 
     * @param id The ID of the API key to delete
     * @return True if the API key was deleted, otherwise false
     */
    deleteApiKey(id: string): boolean;

    //* Reports

    /**
     * 
     * @param reporter The UUID of the player who is reporting
     * @param reason The reason for the report
     * @returns A ReportDocument object representing the created report
     */
    createReport(reporter: string, reason: string): Promise<ReportDocument>;

    //* Referrals

    /**
     * Add a referral to the player
     * @param uuid The UUID of the player being referred
     */
    addReferral(uuid: string): void;

    /**
     * Get the referrer of the player
     * @returns {Promise<PlayerDocument | null>} A PlayerDocument representing the referrer, or null if not found
     */
    getReferrer(): Promise<PlayerDocument | null>;

    /**
     * Check if the player has a referrer
     * @returns {Promise<boolean>} True if the player has a referrer, otherwise false
     */
    hasReferrer(): Promise<boolean>;

    //* Roles

    /**
     * Get all roles assigned to the player
     * @returns {PlayerRole[]} An array of PlayerRole objects representing all roles assigned to
     */
    getAllRoles(): PlayerRole[];

    /**
     * Get all active roles assigned to the player
     * @returns {PlayerRole[]} An array of PlayerRole objects representing active roles
     */
    getActiveRoles(): PlayerRole[];

    /**
     * Get a specific role by its ID
     * @param role The ID of the role to retrieve
     * @param active Whether to return only active roles (default: true)
     * @returns {PlayerRole | null} The PlayerRole object if found, otherwise null
     */
    getRole(id: string, active?: boolean): PlayerRole | null;

    /**
     * Add a role to the player
     * `info.expiresAt` will override `info.duration` if both are provided.
     * @param info The information about the role to add
     * @param info.id The id of the role to add
     * @param info.reason The reason for adding the role
     * @param info.autoRemove Whether the role should be removed when a subscription expires
     * @param info.visible Whether the role icon should be visible (default: true)
     * @param info.expiresAt The expiration date of the role, if applicable (default: null)
     * @param info.duration The duration in milliseconds for which the role is valid, if applicable (default: null)
     * @return {success: boolean, expiresAt: Date | null} An object indicating success and the expiration date of the role
     */
    addRole(info: { id: string, reason: string, autoRemove: boolean, visible?: boolean, expiresAt?: Date | null, duration?: number }): { success: boolean, expiresAt: Date | null };

    /**
     * Remove a role from the player
     * @param id The ID of the role to remove
     * @returns {boolean} True if the role was removed, otherwise false
     */
    removeRole(id: string): boolean;
    
    /**
     * Check if the player has a specific permission
     * @param permission The permission to check
     * @returns {boolean} True if the player has the permission, otherwise false
     */
    hasPermission(permission: Permission): boolean;

    //* Notes

    /**
     * Create a note for the player
     * @param content The content of the note
     * @param author The UUID of the author of the note
     */
    createNote({ content, author }: { content: string, author: string }): PlayerNote;
    
    /**
     * Check if a note with the given ID exists
     * @param id The ID of the note to check
     * @returns {boolean} True if the note exists, otherwise false
     */
    existsNote(id: string): boolean;

    /**
     * Delete a note by its ID
     * @param id The ID of the note to delete
     * @returns {boolean} True if the note was deleted, otherwise false
     */
    deleteNote(id: string): boolean;

    //* Punishments

    /**
     * Clear the player's tag
     * @param reason The reason for clearing the tag
     * @param staff The UUID of the staff member performing the action
     */
    clearTag(reason: string, staff: string): void;
    
    /**
     * Clear the player's icon texture
     * @param reason The reason for clearing the icon texture
     * @param staff The UUID of the staff member performing the action
     */
    clearIconTexture(reason: string, staff: string): void;

    //* Bans

    /**
     * Check if the player is currently banned
     * @return {boolean} True if the player is banned, otherwise false
     */
    isBanned(): boolean;

    /**
     * Ban the player with the given reason and staff information
     * @param data The data for the ban
     * @param data.reason The reason for the ban
     * @param data.staff The UUID of the staff member issuing the ban
     * @param data.appealable Whether the ban is appealable (default: true)
     * @param data.expiresAt The expiration date of the ban, if applicable (default: null)
     */
    banPlayer(data: { reason: string, staff: string, appealable?: boolean, expiresAt?: Date | null }): PlayerBan | null;

    /**
     * Unban the player, removing the current ban
     * @returns {boolean} True if the player was unbanned, otherwise false
     */
    unban(): boolean;
}

const PlayerSchema = new Schema<IPlayer>({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        default: null
    },
    tag: {
        type: String,
        default: null
    },
    position: {
        type: String,
        required: true,
        enum: positions
    },
    icon: new Schema({
        type: {
            type: String,
            required: true,
            enum: icons
        },
        hash: {
            type: String,
            required: true,
            default: null
        }
    }, { _id: false }),
    preferred_language: {
        type: String,
        required: true,
        default: 'en_us'
    },
    tag_history: {
        type: [{
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                required: true,
                default: Date.now
            }
        }],
        required: true,
        default: []
    },
    custom_icon_history: {
        type: [{
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                required: true,
                default: Date.now
            }
        }],
        required: true,
        default: []
    },
    referrals: {
        total: {
            type: [{
                uuid: {
                    type: String,
                    required: true
                },
                referred_at: {
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
    roles: {
        type: [{
            id: {
                type: String,
                required: true
            },
            auto_remove: {
                type: Boolean,
                required: true
            },
            reason: {
                type: String,
                required: true,
                default: null
            },
            visible: {
                type: Boolean,
                required: true,
                default: true
            },
            added_at: {
                type: Date,
                required: true
            },
            expires_at: {
                type: Date,
                required: true,
                default: null
            }
        }],
        required: true,
        default: []
    },
    api_keys: {
        type: [{
            id: {
                type: String,
                required: true
            },
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
            last_used: {
                type: Date,
                required: true,
                default: null
            }
        }],
        required: true,
        default: []
    },
    notes: {
        type: [{
            id: {
                type: String,
                required: true
            },
            content: {
                type: String,
                required: true
            },
        }],
        required: true,
        default: []
    },
    clears: {
        type: [{
            current_value: {
                type: String,
                required: true
            },
            reason: {
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
            cleared_at: {
                type: Date,
                required: true
            }
        }],
        required: true,
        default: []
    },
    locks: {
        type: [{
            id: {
                type: String,
                required: true
            },
            type: {
                type: String,
                enum: Object.values(AccountLockType),
                required: true
            },
            reason: {
                type: String,
                required: true
            },
            staff: {
                type: String,
                required: true
            },
            locked_at: {
                type: Date,
                required: true
            },
            expires_at: {
                type: Date,
                required: true,
                default: null
            }
        }],
        required: true,
        default: []
    },
    watchlist_periods: {
        type: [{
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
            },
            watched_at: {
                type: Date,
                required: true
            },
            expires_at: {
                type: Date,
                required: true,
                default: null
            }
        }],
        required: true,
        default: []
    },
    bans: {
        type: [{
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
            },
            banned_at: {
                type: Date,
                required: true
            },
            expires_at: {
                type: Date,
                required: true,
                default: null
            },
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
                    required: true,
                    default: null
                },
                appealed_at: {
                    type: Date,
                    required: true,
                    default: null
                }
            }
        }],
        required: true,
        default: []
    },
    connections: {
        discord: {
            type: {
                id: {
                    type: String,
                    required: true
                },
                access_token: {
                    type: String,
                    required: true
                },
                access_expiration: {
                    type: Date,
                    required: true
                },
                refresh_token: {
                    type: String,
                    required: true
                }
            },
            required: true,
            default: null
        }
    }
}, {
    methods: {
        getGameProfile(): Promise<GameProfile> {
            return GameProfile.getProfileByUUID(this.uuid);
        },

        createApiKey(name: string): ApiKey {
            const key = {
                id: generateSecureCode(),
                name,
                key: `sk_${generateSecureCode(32)}`,
                created_at: new Date(),
                last_used: null
            }
            this.api_keys.push(key);
            return key;
        },

        getApiKey(id: string): ApiKey | null {
            const key = this.api_keys.find((key) => key.id == id);
            if(!key) return null;
            return key;
        },

        deleteApiKey(id: string): boolean {
            const index = this.api_keys.findIndex((key) => key.id == id);
            if(index === -1) return false;
            this.api_keys.splice(index, 1);
            return true;
        },

        createReport(reporter: string, reason: string): Promise<ReportDocument> {
            return Report.insertOne({
                reported_uuid: this.uuid,
                reporter_uuid: reporter,
                reason,
                actions: [],
                context: {
                    tag: this.tag!,
                    position: this.position,
                    icon: {
                        type: this.icon.type,
                        hash: this.icon.hash || null
                    }
                },
                created_at: new Date(),
                last_updated: new Date()
            });
        },

        getReferrer(): Promise<PlayerDocument | null> {
            return Player.findOne({ 'referrals.total.uuid': this.uuid });
        },

        addReferral(uuid: string): void {
            this.referrals.total.push({ uuid, referred_at: Date.now() });
            this.referrals.current_month++;
        },

        async hasReferrer(): Promise<boolean> {
            const exists = await Player.exists({ 'referrals.total.uuid': this.uuid });
            return !!exists;
        },

        getAllRoles(): PlayerRole[] {
            const roles = getCachedRoles();
            return this.roles.filter(({ id }) => {
                return roles.some((role) => role.id === id);
            }).map((playerRole) => {
                const role = roles.find((role) => role.id === playerRole.id)!;

                return {
                    role,
                    autoRemove: playerRole.auto_remove,
                    reason: playerRole.reason,
                    visible: playerRole.visible,
                    addedAt: playerRole.added_at,
                    expiresAt: playerRole.expires_at
                }
            });
        },

        getActiveRoles(): PlayerRole[] {
            return this.getAllRoles().filter((role) => role.expiresAt == null || role.expiresAt.getTime() > Date.now());
        },

        getRole(id: string, active: boolean = true): PlayerRole | null {
            const roles = active ? this.getActiveRoles() : this.getAllRoles();
            return roles.find((role) => role.role.id === id) || null;
        },

        addRole({ id, reason, autoRemove, visible = true, expiresAt, duration }: { id: string, reason: string, autoRemove: boolean, visible?: boolean, expiresAt?: Date | null, duration?: number }): { success: boolean, expiresAt: Date | null } {
            const roles = getCachedRoles();
            if(!roles.some((role) => role.id === id)) return { success: false, expiresAt: null };

            const playerRole = this.roles.find((role) => role.id === id);
            if(playerRole) {
                if(!playerRole.expires_at) return { success: false, expiresAt: null };
                if(playerRole.expires_at.getTime() > Date.now()) {
                    playerRole.reason += ` | ${reason}`;
                    playerRole.auto_remove = autoRemove;
                    playerRole.expires_at = expiresAt ? expiresAt : duration ? new Date(playerRole.expires_at.getTime() + duration) : null;
                    return { success: true, expiresAt: playerRole.expires_at };
                } else {
                    playerRole.reason = reason;
                    playerRole.auto_remove = autoRemove;
                    playerRole.added_at = new Date();
                    playerRole.expires_at = expiresAt ? expiresAt : duration ? new Date(Date.now() + duration) : null;
                    return { success: true, expiresAt: playerRole.expires_at };
                }
            } else {
                const role = {
                    id,
                    reason,
                    auto_remove: autoRemove,
                    visible,
                    added_at: new Date(),
                    expires_at: expiresAt ? expiresAt : duration ? new Date(Date.now() + duration) : null
                };
                this.roles.push(role);
                return { success: true, expiresAt: role.expires_at };
            }
        },

        removeRole(id: string): boolean {
            const role = this.roles.find((role) => role.id === id);
            if(!role) return false;
            role.expires_at = new Date();
            return true;
        },

        hasPermission(permission: Permission): boolean {
            return this.getActiveRoles().some((role) => role.role.hasPermission(permission));
        },

        createNote({ content, author }: { content: string, author: string }): PlayerNote {
            const note = {
                id: generateSecureCode(),
                content,
                author,
                created_at: new Date()
            };

            this.notes.push(note);
            return note;
        },

        existsNote(id: string): boolean {
            return this.notes.some((note) => note.id == id);
        },

        deleteNote(id: string): boolean {
            const index = this.notes.findIndex((note) => note.id == id);
            if(index === -1) return false;
            this.notes.splice(index, 1);
            return true;
        },

        clearTag(reason: string, staff: string): void {
            this.clears.push({
                current_value: this.tag!,
                reason,
                type: 'tag',
                staff,
                cleared_at: new Date()
            });
            this.tag = null;
        },

        clearIconTexture(reason: string, staff: string): void {
            this.clears.push({
                current_value: this.icon.hash!,
                reason,
                type: 'icon',
                staff,
                cleared_at: new Date()
            });
            this.icon.type = GlobalIcon.None;
            this.icon.hash = null;
        },

        isBanned(): boolean {
            const ban = this.bans.at(-1);
            return !!ban && (!ban.expires_at || ban.expires_at.getTime() > Date.now());
        },

        banPlayer({ reason, staff, appealable = true, expiresAt }: { reason: string, staff: string, appealable?: boolean, expiresAt?: Date | null }): PlayerBan | null {
            if(this.isBanned()) return null;

            const ban = {
                id: generateSecureCode(),
                reason,
                staff,
                banned_at: new Date(),
                expires_at: expiresAt || null,
                appeal: {
                    appealable,
                    appealed: false,
                    reason: null,
                    appealed_at: null
                }
            };
            this.bans.push(ban);

            return ban;
        },

        unban() {
            const ban = this.bans.at(-1);
            if(!ban) return false;
            ban.expires_at = new Date();
            return true;
        },
    }
});

export async function getOrCreatePlayer(uuid: string): Promise<PlayerDocument> {
    uuid = stripUUID(uuid);
    const player = await Player.findOne({ uuid });
    if(player) return player;
    return await Player.create({ uuid });
}

export async function resetMonthlyReferrals() {
    if(!isConnected()) return;
    const data = await Player.find({ 'referrals.current_month': { $gt: 0 } });

    for(const player of data) {
        player.referrals.current_month = 0;
        player.save();
    }
}

export const Player = model<IPlayer>('Player', PlayerSchema);
export type PlayerDocument = HydratedDocument<IPlayer>;