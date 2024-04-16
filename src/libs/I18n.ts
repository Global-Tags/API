import * as english from "../../locales/en-US.json";

export type Language = typeof english;

const languages = new Map<string, Language>();

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