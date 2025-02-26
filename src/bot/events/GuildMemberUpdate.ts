import { GuildMember } from "discord.js";
import Event from "../structs/Event";
import players from "../../database/schemas/players";
import { config } from "../../libs/config";

export default class InteractionCreate extends Event {
    constructor() {
        super('guildMemberUpdate', false);
    }

    async fire(oldMember: GuildMember, newMember: GuildMember) {
        const startedBoosting = !oldMember.premiumSince && newMember.premiumSince;
        const stoppedBoosting = oldMember.premiumSince && !newMember.premiumSince;
        
        if(!startedBoosting && !stoppedBoosting) return;
        const role = config.discordBot.boosterRole;
        if(role.trim().length == 0) return;
        const player = await players.findOne({ 'connections.discord.id': newMember.id });
        if(!player) return;

        if(startedBoosting) {
            if(player.addRole({ name: role, reason: 'Server boost', automated: true }).success) player.save();
        } else if(stoppedBoosting) {
            if(player.removeRole(role)) player.save();
        }
    }
}