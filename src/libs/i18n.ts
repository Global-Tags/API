import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "./Logger";
import { captureException } from "@sentry/bun";
import { translationFilePath } from "./data-accessor";
import keys from "../../data/i18n/en_us.json";

const fallback = 'en_us';
const languages = new Map<string, Language>();

type DotPaths<T> = T extends string
    ? never
    : {
        [K in keyof T & string]: T[K] extends string
            ? K
            : `${K}.${DotPaths<T[K]>}`;
    }[keyof T & string];
    
export type TranslationKey = string;//`$.${DotPaths<typeof keys>}`; TODO: uncomment when all translations are proofread
export type Language = Map<string, string>;
export type I18nFunction = (path: TranslationKey) => string;

export async function load() {
    const languageDirectory = translationFilePath;
    if(!existsSync(languageDirectory)) return Logger.error('Translation directory not found!');
    for(const file of readdirSync(languageDirectory).filter((file) => file.endsWith('.json'))) {
        const id = file.replace('.json', '');
        const locales = new Map<string, string>();
        extractTranslations(locales, await import(join(languageDirectory, file)))
        languages.set(id, locales);
    }
    if(!languages.has(fallback)) throw new Error(`Fallback language "${fallback}" not found!`);
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
    if(languages.size === 0) throw new Error('Languages have not been loaded yet!');
    if(languages.has(language)) return languages.get(language)!;
    else return getLanguage();
}

export function isValidLanguage(language: string): boolean {
    return languages.has(language.toLowerCase())
}

export function translate(
    language: Language,
    key: TranslationKey
): string {
    let path = key as string;
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