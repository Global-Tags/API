import { CronJob } from "cron";
import metrics from "../database/schemas/metrics";
import players, { GlobalIcon, GlobalPosition } from "../database/schemas/players";
import Logger from "./Logger";
import axios from "axios";
import { client } from "../bot/bot";
import * as config from "../../config.json";
import { args } from "..";

let requests: number;

export function loadRequests() {
    const defaultValue = Number(args["requests"]);
    requests = !isNaN(defaultValue) ? defaultValue : 0;
}

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
    const mod = await fetchMod('globaltags');
    
    new metrics({
        players: users.length,
        tags,
        admins: staff,
        bans,
        downloads: {
            flintmc: addon?.downloads ?? 0,
            modrinth: mod?.downloads ?? 0
        },
        ratings: {
            flintmc: addon?.rating.rating ?? 0
        },
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

async function fetchMod(id: string): Promise<{ downloads: number } | null> {
    try {
        const data = await axios.get(`https://api.modrinth.com/v2/project/${id}`, { headers: { 'Accept-Encoding': 'gzip' } });
        return data.data as { downloads: number };
    } catch(error) {
        Logger.error(`Error while trying to fetch mod "${id}": ${error}`);
        return null;
    }
}