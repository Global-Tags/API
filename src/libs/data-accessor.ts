import { join } from 'path';
import { MailTemplate } from '../types/MailTemplate';

const dataPath = (...paths: string[]) => join(__dirname, '..', '..', 'data', ...paths);

export namespace CertificateFiles {
    export const publicKeyFile = Bun.file(dataPath('certificate', 'pubkey.pem'));
    export const privateKeyFile = Bun.file(dataPath('certificate', 'privkey.pem'));
}

export const customIconPath = (uuid: string) => dataPath('icons', 'players', uuid);

export const customIconFile = (uuid: string, hash: string) => {
    return Bun.file(dataPath('icons', 'players', uuid, `${hash.trim()}.png`));
}

export const roleIconFile = (role: string) => {
    return Bun.file(dataPath('icons', 'roles', `${role}.png`));
}

export const mailTemplateFile = (template: MailTemplate) => {
    return Bun.file(dataPath('mail', `${template}.html`));
}