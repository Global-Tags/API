import { TransportOptions, createTransport } from "nodemailer";
import { config } from "./config";
import { join } from "path";
import Logger from "./Logger";
import { capitalCase } from "change-case";
import { I18nFunction } from "./i18n";
import moment from "moment";
import { stripColors } from "./chat-color";

const { mailer } = config;

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
        message = message.replaceAll(`[${variable[0]}]`, variable[1].trim());
    }

    return await transporter.sendMail({
        from: `"${mailer.sender.name}" <${mailer.sender.address}>`,
        to: recipient.trim(),
        subject: subject,
        html: message
    });
}

export function sendBanEmail({ address, reason, duration, appealable, i18n }: { address: string, reason: string, duration: Date | null, appealable: boolean, i18n: I18nFunction }) {
    const permanent = !duration;
    const durationOptions: MailOptions['variables'] = [];

    if(!permanent) {
        durationOptions.push(['duration', i18n('email.banned.duration')]);
        durationOptions.push(['duration_value', i18n('email.banned.until').replace('<date>', moment(duration).format('DD.MM.YYYY HH:mm'))]);
    }

    sendEmail({
        recipient: address,
        subject: i18n('email.banned.subject'),
        template: 'banned',
        variables: [
            ['title', i18n('email.banned.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n(`email.banned.description.${permanent ? 'permanent' : 'temporary'}`)],
            ['reason', i18n('email.banned.reason')],
            ['reason_value', reason],
            ['duration_visibility', permanent ? 'none' : 'initial'],
            ...durationOptions,
            ['appeal', i18n(`email.banned.${appealable ? 'a' : 'noA'}ppeal`)],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendUnbanEmail(address: string, i18n: I18nFunction) {
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

export function sendTagClearEmail(address: string, tag: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('email.tagCleared.subject'),
        template: 'tag_cleared',
        variables: [
            ['title', i18n('email.tagCleared.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.tagCleared.description')],
            ['tag', `"${stripColors(tag)}"`],
            ['warning', i18n('email.tagCleared.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendTagChangeEmail(address: string, oldTag: string, newTag: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('email.tagChanged.subject'),
        template: 'tag_changed',
        variables: [
            ['title', i18n('email.tagChanged.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.tagChanged.description')],
            ['previous', i18n('email.tagChanged.previous')],
            ['old_tag', `"${stripColors(oldTag)}"`],
            ['new', i18n('email.tagChanged.new')],
            ['new_tag', `"${stripColors(newTag)}"`],
            ['warning', i18n('email.tagChanged.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendPositionChangeEmail(address: string, oldPosition: string, newPosition: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('email.positionChanged.subject'),
        template: 'position_changed',
        variables: [
            ['title', i18n('email.positionChanged.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.positionChanged.description')],
            ['previous', i18n('email.positionChanged.previous')],
            ['old_position', capitalCase(oldPosition)],
            ['new', i18n('email.positionChanged.new')],
            ['new_position', capitalCase(newPosition)],
            ['warning', i18n('email.positionChanged.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendIconTypeChangeEmail(address: string, oldIcon: string, newIcon: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('email.iconChanged.subject'),
        template: 'icon_changed',
        variables: [
            ['title', i18n('email.iconChanged.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.iconChanged.description')],
            ['previous', i18n('email.iconChanged.previous')],
            ['old_icon', capitalCase(oldIcon)],
            ['new', i18n('email.iconChanged.new')],
            ['new_icon', capitalCase(newIcon)],
            ['warning', i18n('email.iconChanged.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}

export function sendIconClearEmail(address: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('email.iconCleared.subject'),
        template: 'icon_cleared',
        variables: [
            ['title', i18n('email.iconCleared.title')],
            ['greeting', i18n('email.greeting')],
            ['description', i18n('email.iconCleared.description')],
            ['warning', i18n('email.iconCleared.warning')],
            ['footer', i18n('email.footer')],
        ]
    });
}