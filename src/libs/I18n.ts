import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "./Logger";
import players from "../database/schemas/players";

export type Language = Map<string, string>;
export type I18nFunction = (path: string) => string;

const fallback = 'en_us';
const languages = new Map<string, Language>();

export async function load() {
    languages.clear();
    const languageDirectory = join(__dirname, '..', '..', 'locales');
    if(!existsSync(languageDirectory)) return Logger.error(`Translation directory not found!`);
    for(const file of readdirSync(languageDirectory).filter((file) => file.endsWith(`.json`))) {
        const id = file.replace(`.json`, '');
        const locales = new Map<string, string>();
        extractTranslations(locales, await import(join(languageDirectory, file)))
        languages.set(id, locales);
    }
    Logger.debug(`Loaded ${languages.size} languages`);
}

function extractTranslations(target: Language, json: any, parentKey?: string): void {
    for (const key in json) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof json[key] === 'object' && json[key] !== null) {
            extractTranslations(target, json[key], fullKey);
        } else if (typeof json[key] === 'string') {
            target.set(fullKey, json[key] as string);
        }
    }
}

export function getLanguage(language: string = fallback): Language {
    if(languages.has(language)) return languages.get(language)!;
    else return getLanguage();
}

export function isValidLanguage(language: string): boolean {
    return languages.has(language.toLowerCase())
}

export function translate(path: string, language: Language): string {
    if(language.has(path)) return language.get(path)!;
    return getLanguage().get(path) || path;
}

export async function saveLastLanguage(uuid: string, language: string) {
    const player = await players.findOne({ uuid });
    if(!player) return;
    if(player.last_language != language && isValidLanguage(language)) {
        player.last_language = language;
        await player.save();
    }
}