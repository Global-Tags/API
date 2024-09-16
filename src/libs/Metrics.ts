import { CronJob } from "cron";
import metrics from "../database/schemas/metrics";
import players, { GlobalIcon, GlobalPosition } from "../database/schemas/players";
import Logger from "./Logger";
import axios from "axios";
import { client } from "../bot/bot";
import * as config from "../../config.json";

let requests = 0;

export function recordRequest() {
    requests++;
}

export function getRequests(): number {
    return requests;
}

const positionList = Object.keys(GlobalPosition)
    .filter((pos) => isNaN(Number(pos)))
    .map((pos) => pos.toUpperCase());

const iconList = Object.keys(GlobalIcon)
    .filter((pos) => isNaN(Number(pos)))
    .map((pos) => pos.toUpperCase());

type Addon = {
    id: number,
    namespace: string,
    name: string,
    featured: boolean,
    verified: boolean,
    organization: number,
    author: string,
    downloads: number,
    download_string: string,
    short_description: string,
    rating: {
        count: number,
        rating: number
    },
    changelog: string,
    required_labymod_build: number,
    releases: number,
    last_update: number,
    licence: string,
    version_string: string,
    meta: [],
    dependencies: [{ namespace: string, optional: boolean }],
    permissions: [string],
    source_url: string,
    brand_images: [{ type: string, hash: string }],
    tags: [number]
}

export function initializeMetrics() {
    Logger.debug(`Metric initialized.`);
    new CronJob(`0 0 * * *`, saveMetrics, null, true, "Europe/Berlin");
}

async function saveMetrics() {
    if(config.bot.synced_roles.enabled) await client.guilds.cache.get(config.bot.synced_roles.guild)?.members.fetch();
    const users = await players.find();
    const tags = users.filter((user) => user.tag != null).length;
    const staff = users.filter((user) => user.hasAnyElevatedPermission()).length;
    const bans = users.filter((user) => user.isBanned()).length;
    const positions = positionList.reduce((object: any, position) => {
        object[position.toLowerCase()] = users.filter((user) => user.position.toUpperCase() == position.toUpperCase()).length;
        return object;
    }, {});
    const icons = iconList.reduce((object: any, icon) => {
        object[icon.toLowerCase()] = users.filter((user) => user.icon.toUpperCase() == icon.toUpperCase()).length;
        return object;
    }, {});
    const addon = await fetchAddon('globaltags');
    
    new metrics({
        players: users.length,
        tags,
        admins: staff,
        bans,
        downloads: addon?.downloads ?? -1,
        rating: addon?.rating.rating ?? -1,
        dailyRequests: getRequests(),
        positions,
        icons
    }).save();
    requests = 0;
    Logger.debug(`New metric saved!`);
}

async function fetchAddon(namespace: string): Promise<Addon | null> {
    try {
        const data = await axios.get(`https://flintmc.net/api/client-store/get-modification/${namespace}`, { headers: { 'Accept-Encoding': 'gzip' } });
        return data.data as Addon;
    } catch(error) {
        Logger.error(`Error while trying to fetch addon "${namespace}": ${error}`);
        return null;
    }
}