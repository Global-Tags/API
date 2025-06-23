import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "./Logger";
import { captureException } from "@sentry/bun";

export type Language = Map<string, string>;
export type I18nFunction = (path: string) => string;

const fallback = 'en_us';
const languages = new Map<string, Language>();

export async function load() {
    const languageDirectory = join(__dirname, '..', '..', 'locales');
    if(!existsSync(languageDirectory)) return Logger.error('Translation directory not found!');
    for(const file of readdirSync(languageDirectory).filter((file) => file.endsWith('.json'))) {
        const id = file.replace('.json', '');
        const locales = new Map<string, string>();
        extractTranslations(locales, await import(join(languageDirectory, file)))
        languages.set(id, locales);
    }
    Logger.debug(`Loaded ${languages.size} languages`);
}

function extractTranslations(target: Language, json: any, parentKey?: string): void {
    for (const key in json) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const value = json[key];

        if (typeof value === 'object' && value !== null) {
            extractTranslations(target, value, fullKey);
        } else if (typeof value === 'string' && value.trim() !== '') {
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
    if(!path.startsWith('\$\.')) {
        const error = new Error(`Translation path "${path}" was not prefixed with "$."!`);
        Logger.warn(error.message);
        captureException(error);
    } else {
        path = path.slice(2);
    }
    if(language.has(path)) return language.get(path)!;
    return getLanguage().get(path) || path;
}