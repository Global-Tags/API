import { Schema, model } from "mongoose";
import { bot, roles } from "../../../config.json";
import { client } from "../../bot/bot";
import Logger from "../../libs/Logger";

export enum GlobalPosition {
    Above,
    Below,
    Right,
    Left
}

export enum GlobalIcon {
    None,
    Custom,
    Android,
    Apple,
    Bereal,
    Crown,
    Discord,
    Duolingo,
    Ebio,
    Epicgames,
    Gamescom,
    Github,
    Gitlab,
    Heart,
    Instagram,
    Kick,
    Labynet,
    Paypal,
    Pinterest,
    Playstation,
    Reddit,
    Snapchat,
    Soundcloud,
    Spotify,
    Star,
    Statsfm,
    Steam,
    Telegram,
    Threads,
    Tiktok,
    Twitch,
    X,
    Xbox,
    Youtube
}

export enum Permission {
    BypassValidation,
    CustomIcon,
    ManageBans,
    ManageRoles,
    ManageTags,
    ManageWatchlist,
    ReportImmunity
}

export interface IPlayer {
    uuid: string,
    tag?: string | null,
    position: string,
    icon: string,
    history: string[],
    watchlist: boolean,
    referred: boolean,
    referrals: { uuid: string, timestamp: number }[],
    reports: { by: String, reportedName: String, reason: String }[],
    roles: string[],
    api_keys: string[],
    ban: { active: boolean, reason?: string | null, appealable: boolean, appealed: boolean, staff?: string | null },
    clears: { currentTag: string, staff: string, timestamp: number }[],
    connections: {
        discord: { id?: string | null, code?: string | null },
        email: { address?: string | null, code?: string | null }
    },
    isEmailVerified(): boolean,
    getRoles(): string[],
    getPermissions(): { [key: string]: boolean },
    hasPermission(permission: Permission): boolean,
    hasAnyElevatedPermission(): boolean,
    isBanned(): boolean,
    banPlayer(reason: string, staff: string, appealable?: boolean): void,
    unban(): void,
    clearTag(staff: string): void
}

const schema = new Schema<IPlayer>({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    tag: String,
    position: {
        type: String,
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
    referred: {
        type: Boolean,
        required: true,
        default: false
    },
    referrals: {
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
    api_keys: {
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
        },
        staff: String
    },
    clears: [{
        currentTag: {
            type: String,
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
        isEmailVerified() {
            return this.connections.email.address && !this.connections.email.code;
        },

        getRoles() {
            if(!bot.synced_roles.enabled) return roles.filter((role) => this.roles.some((name) => name.toUpperCase() == role.name.toUpperCase())).map((role) => role.name);
            if(!this.connections?.discord?.id) return [];
            const guild = client.guilds.cache.get(bot.synced_roles.guild);
            if(!guild) {
                client.guilds.fetch(bot.synced_roles.guild).catch(() => Logger.error(`Couldn't fetch guild ${bot.synced_roles.guild}`));
                return [];
            }
            const member = guild.members.cache.get(this.connections.discord.id);
            if(!member) {
                guild.members.fetch(this.connections.discord.id).catch(() => Logger.error(`Couldn't fetch member ${this.connections.discord!.id}`));
                return [];
            }
            return Object
                .keys(bot.synced_roles.roles)
                .filter((key) => {
                    const role = roles.find((role) => role.name.toUpperCase() == key.toUpperCase());
                    if(!role) return false;
                    const roleIds = bot.synced_roles.roles[role.name as keyof typeof bot.synced_roles.roles];
                    if(!roleIds) return false;
                    return roleIds.some((id) => member.roles.cache.has(id));
                })
                .map((role) => role);
        },

        getPermissions() {
            const localRoles = this.getRoles();
            const permissions: { [key: string]: boolean } = {};
            for(const permission of Object.keys(Permission).filter(key => isNaN(Number(key)))) {
                permissions[permission] = localRoles.some((key) => {
                    const role = roles.find((r) => r.name == key)!;
                    if(!role) return false;
                    return role.permissions[permission as keyof typeof role.permissions] || false;
                });
            }
            return permissions;
        },

        hasPermission(permission: Permission) {
            const permissions = this.getPermissions();
            return permissions[Permission[permission]];
        },

        hasAnyElevatedPermission() {
            const permissions = this.getPermissions();
            return [
                Permission.ManageBans,
                Permission.ManageRoles,
                Permission.ManageTags,
                Permission.ManageWatchlist
            ].some((permission) => permissions[Permission[permission]]);
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
                currentTag: this.tag || '--',
                staff,
                timestamp: new Date().getTime()
            })
            this.tag = null;
        }
    }
});

export default model<IPlayer>('players', schema);