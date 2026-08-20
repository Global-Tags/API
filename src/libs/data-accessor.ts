import { join } from 'path';
import { MailTemplate } from '../types/MailTemplate';

const dataPath = (...paths: string[]) => join(__dirname, '..', '..', 'data', ...paths);
const iconPath = (...paths: string[]) => dataPath('icons', ...paths);

export namespace CertificateFiles {
    export const publicKeyFile = Bun.file(dataPath('certificate', 'pubkey.pem'));
    export const privateKeyFile = Bun.file(dataPath('certificate', 'privkey.pem'));
}

export const translationFilePath = dataPath('i18n');

export const customIconPath = (uuid: string) => iconPath('players', uuid);

export const customIconFile = (uuid: string, hash: string) => {
    return Bun.file(iconPath('players', uuid, `${hash.trim()}.png`));
}

export const roleIconFile = (role: string) => {
    return Bun.file(iconPath('roles', `${role}.png`));
}

export const partnerIconFile = (partner: string) => {
    return Bun.file(iconPath('partners', `${partner}.png`));
}

export const mailTemplateFile = (template: MailTemplate) => {
    return Bun.file(dataPath('mail', `${template}.html`));
}