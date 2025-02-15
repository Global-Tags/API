import { GuildMember } from "discord.js";
import Event from "../structs/Event";
import players from "../../database/schemas/players";
import { config } from "../../libs/config";

export default class GuildMemberAdd extends Event {
    constructor() {
        super('guildMemberAdd', false);
    }

    async fire(member: GuildMember) {
        if(!config.discordBot.notifications.entitlements.enabled || member.guild.id != config.discordBot.server) return;
        const player = await players.findOne({ 'connections.discord.id': member.id });
        if(!player) return;
        
        for(const role of player.getRoles()) {
            for(const roleId of role.role.getSyncedRoles()) {
                member.roles.add(roleId, `Synced role: ${role.reason || 'Unknown reason'}`);
            }
        }
    }
}