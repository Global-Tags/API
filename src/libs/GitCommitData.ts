import axios from "axios";
import { config } from "./Config";

const { github } = config;

let commit: string | null = null;

export async function retrieveData() {
    const result = await axios.get(`https://api.github.com/repos/${github.owner}/${github.repository}/commits/${github.branch}`).catch(() => null);
    if(!result) return;
    commit = result.data.sha;
}

export function getLatestCommit(): string | null {
    return commit;
}