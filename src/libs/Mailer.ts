import { TransportOptions, createTransport } from "nodemailer";
import { mailer } from "../../config.json";
import { join } from "path";
import Logger from "./Logger";
import { getI18nFunctionByLanguage } from "../middleware/FetchI18n";

type MailOptions = {
    recipient: string,
    subject: string,
    template: string,
    variables?: string[][]
}

const transporter = createTransport({
    host: mailer.host,
    port: mailer.port,
    secure: mailer.secure,
    auth: {
        user: mailer.auth.username,
        pass: mailer.auth.password
    }
} as TransportOptions);

export async function verify() {
    transporter.verify((error) => {
        if(error) Logger.error(`Invalid mailer options: ${error.message}`);
        else Logger.info('Mailer options verified!');
    });
}

export async function sendEmail({ recipient, subject, template, variables = [] }: MailOptions) {
    if(!mailer.enabled) return;
    const file = Bun.file(join(__dirname, '..', 'mail', `${template}.html`));
    if(!file.exists()) throw new Error('Template does not exist!');
    let message = await file.text();
    for(const variable of variables) {
        message = message.replaceAll(`[${variable[0]}]`, variable[1]);
    }

    return await transporter.sendMail({
        from: `"${mailer.sender.name}" <${mailer.sender.address}>`,
        to: recipient,
        subject: subject,
        html: message
    });
}

const i18n = getI18nFunctionByLanguage();

export function sendBanEmail(address: string, reason: string) {
    sendEmail({
        recipient: address,
        subject: i18n('email.banned.subject'),
        template: 'banned',
        variables: [
            ['title', i18n('email.banned.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.banned.description')],
            ['reason', reason],
            ['appeal', i18n('email.banned.appeal')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendUnbanEmail(address: string) {
    sendEmail({
        recipient: address,
        subject: i18n('email.unbanned.subject'),
        template: 'unbanned',
        variables: [
            ['title', i18n('email.unbanned.title')],
            ['greeting', i18n('email.greeting')],
            ['unbanned', i18n('email.unbanned.unbanned')],
            ['access', i18n('email.unbanned.access')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendTagClearEmail(address: string, tag: string) {
    sendEmail({
        recipient: address,
        subject: i18n('email.tagCleared.subject'),
        template: 'tag_cleared',
        variables: [
            ['title', i18n('email.tagCleared.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.tagCleared.description')],
            ['tag', `"${tag}"`],
            ['warning', i18n('email.tagCleared.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendTagChangeEmail(address: string, oldTag: string, newTag: string) {
    sendEmail({
        recipient: address,
        subject: i18n('email.tagChanged.subject'),
        template: 'tag_changed',
        variables: [
            ['title', i18n('email.tagChanged.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.tagChanged.description')],
            ['previous', i18n('email.tagChanged.previous')],
            ['old_tag', `"${oldTag}"`],
            ['new', i18n('email.tagChanged.new')],
            ['new_tag', `"${newTag}"`],
            ['warning', i18n('email.tagChanged.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}