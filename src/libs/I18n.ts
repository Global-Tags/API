import * as english from "../../locales/en_us.json";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Logger from "./Logger";
import { $ } from "bun";

export type Language = typeof english;
export type I18nFunction = (path: string) => string;

const languages = new Map<string, Language>();

export async function load() {
    languages.clear();
    const localeDir = join(__dirname, '..', '..', 'locales');
    if(!existsSync(localeDir)) return Logger.error(`Locales directory not found!`);
    for(const file of readdirSync(localeDir).filter((file) => file.endsWith(`.json`))) {
        const id = file.replace(`.json`, '');
        const locales = await import(join(localeDir, file)) as Language;
        languages.set(id, locales);
    }
    Logger.debug(`Loaded ${languages.size} languages`);
}

export function getLocales(language: string): Language {
    if(languages.has(language)) return languages.get(language)!;
    else return english;
}

export function getPath(path: string, locales: Language): string {
    if(typeof locales != `object` || typeof path != `string`) return path;
    let value: any = locales;

    for(const key of path.split(`.`)) {
        if(!value[key as keyof Language]) return path;
        value = value[key as keyof Language];
    }

    return value;
}