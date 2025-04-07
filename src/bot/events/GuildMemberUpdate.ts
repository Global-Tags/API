import { GuildMember } from "discord.js";
import Event from "../structs/Event";
import players from "../../database/schemas/players";
import { config } from "../../libs/config";

export default class InteractionCreateEvent extends Event {
    constructor() {
        super('guildMemberUpdate', false);
    }

    async fire(oldMember: GuildMember, newMember: GuildMember) {
        const startedBoosting = !oldMember.premiumSince && newMember.premiumSince;
        const stoppedBoosting = oldMember.premiumSince && !newMember.premiumSince;
        
        if(!startedBoosting && !stoppedBoosting) return;
        const boosterRole = config.discordBot.boosterRole;
        if(boosterRole.trim().length == 0) return;
        const player = await players.findOne({ 'connections.discord.id': newMember.id });
        if(!player) return;

        if(startedBoosting) {
            if(player.addRole({ name: boosterRole, reason: 'Server boost', autoRemove: true }).success) player.save();
        } else if(stoppedBoosting) {
            const role = player.getRole(boosterRole);
            if(role && role.autoRemove && player.removeRole(boosterRole)) player.save();
        }
    }
}