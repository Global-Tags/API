import { Entitlement } from "discord.js";
import Event from "../structs/Event";
import { client, fetchGuild } from "../bot";
import Logger from "../../libs/Logger";
import players from "../../database/schemas/players";
import { sendEntitlementMessage } from "../../libs/discord-notifier";
import { config } from "../../libs/config";
import { getSkus } from "../../libs/sku-manager";

const skus = getSkus();
const roleReason = 'Discord entitlement';

export default class EntitlementCreate extends Event {
    constructor() {
        super('entitlementCreate', false);
    }

    async fire(entitlement: Entitlement) {
        if(!config.discordBot.notifications.entitlements.enabled) return;
        const sku = skus.find((sku) => sku.id == entitlement.skuId);
        if(!sku) return;
        const player = await players.findOne({ 'connections.discord.id': entitlement.userId });

        sendEntitlementMessage(
            player?.uuid || '',
            `${!entitlement.startsTimestamp ? '[**S**] ' : ''}<@!${entitlement.userId}> just subscribed to **${sku.name}**!`, // Temporary replacement for Entitlement#isTest. See https://github.com/discordjs/discord.js/issues/10610
            !!player,
        );

        if(player) {
            const role = player.roles.find((role) => role.name == sku.role);
            if(role) {
                if(role.expires_at && role.expires_at > new Date()) {
                    role.added_at = new Date();
                    role.manually_added = false;
                    role.expires_at = null;
                    role.reason = roleReason;
                    await player.save();
                }
            } else {
                player.roles.push({
                    name: sku.role,
                    added_at: new Date(),
                    manually_added: false,
                    reason: roleReason
                });
                await player.save();
            }
        }
        if(sku.discordRole) {
            const guild = await fetchGuild().catch(() => {
                Logger.error(`Couldn't fetch guild ${config.discordBot.server}`);
                return null;
            });
            if(!guild) return;
            const member = await guild.members.fetch(entitlement.userId).catch(() => {
                Logger.error(`Couldn't fetch member ${entitlement.userId}`);
                return null;
            });
            if(!member) return;
            member.roles.add(sku.discordRole);
        }
    }
}