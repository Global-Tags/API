import { snakeCase } from "change-case";

export async function processUploadedImage(image: Bun.Image, maxResolution: number, target: Bun.BunFile): Promise<number> {
    try {
        const metadata = await image.metadata();
        const side = Math.min(metadata.width, metadata.height, maxResolution);

        return await image.resize(side, side).png().write(target);
    } catch(err) {
        return Promise.reject(err);
    }
}

const KNOWN_ERRORS = [
    'ERR_IMAGE_DECODE_FAILED',
    'ERR_IMAGE_UNKNOWN_FORMAT',
    'ERR_IMAGE_FORMAT_UNSUPPORTED',
    'ERR_IMAGE_TOO_MANY_PIXELS'
];

export function imageErrorTranslation(error: any): string {
    if(!error || !error.code || !KNOWN_ERRORS.includes(error.code)) return '$.error.icon_upload.unknown';
    return `$.error.icon_upload.${snakeCase(error.code.slice(10))}`; // remove 'ERR_IMAGE_' prefix and convert to snake_case
}