import { GuildMember } from "discord.js";
import Event from "../structs/Event";
import { config } from "../../libs/config";
import { getCachedRoles, synchronizeRoles } from "../../database/schemas/roles";

export default class GuildMemberUpdate extends Event {
    constructor() {
        super('guildMemberUpdate', false);
    }
    
    public fire(oldMember: GuildMember, newMember: GuildMember) {
        if(oldMember.guild.id !== config.discordBot.server) return;
        for(const role of getCachedRoles()) {
            const hasOld = role.getSyncedRoles().some((role) => oldMember.roles.cache.has(role));
            const hasNew = role.getSyncedRoles().some((role) => newMember.roles.cache.has(role));
            if((hasOld && hasNew) || (!hasOld && !hasNew)) continue;
            synchronizeRoles();
        }
    }
}