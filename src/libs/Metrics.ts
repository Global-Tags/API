import { CronJob } from "cron";
import metrics from "../database/schemas/metrics";
import players from "../database/schemas/players";

export function initializeMetrics() {
    new CronJob(`0 0 * * *`, saveMetrics, null, true);
}

async function saveMetrics() {
    const users = await players.find();
    const tags = users.filter((user) => user.tag != null).length;
    const admins = users.filter((user) => user.admin == true).length;
    const bans = users.filter((user) => user.isBanned()).length;
    const positions = (await players.distinct("position")).reduce((object: any, position) => {
        object[position.toLowerCase()] = users.filter((user) => user.position.toUpperCase() == position.toUpperCase()).length;
        return object;
    }, {});
    const icons = (await players.distinct("icon")).reduce((object: any, icon) => {
        object[icon.toLowerCase()] = users.filter((user) => user.icon.toUpperCase() == icon.toUpperCase()).length;
        return object;
    }, {});
    
    new metrics({
        players: users.length,
        tags,
        admins,
        bans,
        positions,
        icons
    }).save();
}