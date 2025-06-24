import Logger from "./Logger";
import axios from "axios";
import { fetchGuild } from "../bot/bot";
import { args } from "..";
import { config } from "./config";
import { getCachedRoles } from "../database/schemas/Role";
import { GlobalIcon, icons as iconList } from "../types/GlobalIcon";
import { snakeCase } from "change-case";
import { GlobalPosition, positions as positionList } from "../types/GlobalPosition";
import { captureException } from "@sentry/bun";
import { Metric } from "../database/schemas/Metric";
import { Player } from "../database/schemas/Player";

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

export async function saveMetrics() {
    if(config.discordBot.syncedRoles.enabled) await (await fetchGuild())?.members.fetch();
    const players = await Player.find();
    const tags = players.filter((player) => player.tag != null).length;
    const admins = players.filter((player) => {
        const adminRole = getCachedRoles().find((role) => role.name == config.metrics.adminRole);
        return !!adminRole && player.getActiveRoles().some((role) => role.role.name == adminRole.name);
    }).length;
    const bans = players.filter((player) => player.isBanned()).length;
    const positions = positionList.reduce((object: any, position) => {
        object[position] = players.filter((player) => position == snakeCase(player.position)).length;
        return object;
    }, {});
    const icons = iconList.reduce((object: any, icon) => {
        object[icon] = players.filter((user) => icon == snakeCase(user.icon.type)).length;
        return object;
    }, {});
    const addon = await fetchAddon('globaltags');
    const mod = await fetchMod('globaltags');
    
    Metric.insertOne({
        players: players.length,
        tags,
        admins,
        bans,
        downloads: {
            flintmc: addon?.downloads ?? 0,
            modrinth: mod?.downloads ?? 0
        },
        ratings: {
            flintmc: addon?.rating.rating ?? 0
        },
        daily_requests: getRequests(),
        positions,
        icons
    }).catch((error) => {
        captureException(error);
        Logger.error(`Error while trying to save metrics: ${error}. Request count: ${requests}`)
    }).then(() =>
        Logger.debug('New metrics saved!')
    );

    requests = 0;
}

async function fetchAddon(namespace: string): Promise<Addon | null> {
    try {
        const data = await axios.get(`https://flintmc.net/api/client-store/get-modification/${namespace}?now=${Date.now()}`, { headers: { 'Accept-Encoding': 'gzip' } });
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