const colorCodes = /(&|§)[0-9A-FK-ORX]/gi;

export function stripColors(text: string): string {
    return text.replaceAll(colorCodes, '');
}

export function translateToAnsi(text: string): string {
    return text
        .replaceAll(/(&|§)0/gi, `[0;30m`)
        .replaceAll(/(&|§)7/gi, `[0;30m`)
        .replaceAll(/(&|§)8/gi, `[0;30m`)
        .replaceAll(/(&|§)4/gi, `[0;31m`)
        .replaceAll(/(&|§)c/gi, `[0;31m`)
        .replaceAll(/(&|§)2/gi, `[0;32m`)
        .replaceAll(/(&|§)a/gi, `[0;32m`)
        .replaceAll(/(&|§)6/gi, `[0;33m`)
        .replaceAll(/(&|§)e/gi, `[0;33m`)
        .replaceAll(/(&|§)1/gi, `[0;34m`)
        .replaceAll(/(&|§)9/gi, `[0;34m`)
        .replaceAll(/(&|§)5/gi, `[0;35m`)
        .replaceAll(/(&|§)d/gi, `[0;35m`)
        .replaceAll(/(&|§)3/gi, `[0;36m`)
        .replaceAll(/(&|§)b/gi, `[0;36m`)
        .replaceAll(/(&|§)f/gi, `[0;37m`)
        .replaceAll(/(&|§)r/gi, `[0;37m`)
        .replace(/(&|§)[0-9A-FK-ORX]/gi, ``);
}