import { TransportOptions, createTransport } from "nodemailer";
import { config } from "./config";
import Logger from "./Logger";
import { capitalCase } from "change-case";
import { I18nFunction } from "./i18n";
import moment from "moment";
import { stripColors } from "./chat-color";
import { MailTemplate } from "../types/MailTemplate";
import { mailTemplateFile } from "./data-accessor";

const { mailer } = config;

type MailOptions = {
    recipient: string,
    subject: string,
    template: MailTemplate,
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

export let enabled = mailer.enabled;

export async function verify() {
    transporter.verify((error) => {
        if(error) {
            enabled = false;
            Logger.error(`Invalid mailer options: ${error.message}`);
        }
        else Logger.info('Mailer options verified!');
    });
}

export async function sendEmail({ recipient, subject, template, variables = [] }: MailOptions) {
    if(!mailer.enabled) return;
    const file = mailTemplateFile(template);
    if(!(await file.exists())) throw new Error('Template does not exist!');
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
        durationOptions.push(['duration', i18n('$.email.banned.duration')]);
        durationOptions.push(['duration_value', i18n('$.email.banned.until').replace('<date>', moment(duration).format('DD.MM.YYYY HH:mm'))]);
    }

    sendEmail({
        recipient: address,
        subject: i18n('$.email.banned.subject'),
        template: MailTemplate.Banned,
        variables: [
            ['title', i18n('$.email.banned.title')],
            ['greeting', i18n('$.email.greeting')],
            ['description', i18n(permanent ? '$.email.banned.description.permanent' : '$.email.banned.description.temporary')],
            ['reason', i18n('$.email.banned.reason')],
            ['reason_value', reason],
            ['duration_visibility', permanent ? 'none' : 'initial'],
            ...durationOptions,
            ['appeal', i18n(appealable ? '$.email.banned.appeal' : '$.email.banned.noAppeal')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}

export function sendUnbanEmail(address: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('$.email.unbanned.subject'),
        template: MailTemplate.Unbanned,
        variables: [
            ['title', i18n('$.email.unbanned.title')],
            ['greeting', i18n('$.email.greeting')],
            ['unbanned', i18n('$.email.unbanned.unbanned')],
            ['access', i18n('$.email.unbanned.access')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}

export function sendTagClearEmail(address: string, tag: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('$.email.tagCleared.subject'),
        template: MailTemplate.TagCleared,
        variables: [
            ['title', i18n('$.email.tagCleared.title')],
            ['greeting', i18n('$.email.greeting')],
            ['description', i18n('$.email.tagCleared.description')],
            ['tag', `"${stripColors(tag)}"`],
            ['warning', i18n('$.email.tagCleared.warning')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}

export function sendTagChangeEmail(address: string, oldTag: string, newTag: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('$.email.tagChanged.subject'),
        template: MailTemplate.TagChanged,
        variables: [
            ['title', i18n('$.email.tagChanged.title')],
            ['greeting', i18n('$.email.greeting')],
            ['description', i18n('$.email.tagChanged.description')],
            ['previous', i18n('$.email.tagChanged.previous')],
            ['old_tag', `"${stripColors(oldTag)}"`],
            ['new', i18n('$.email.tagChanged.new')],
            ['new_tag', `"${stripColors(newTag)}"`],
            ['warning', i18n('$.email.tagChanged.warning')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}

export function sendPositionChangeEmail(address: string, oldPosition: string, newPosition: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('$.email.positionChanged.subject'),
        template: MailTemplate.PositionChanged,
        variables: [
            ['title', i18n('$.email.positionChanged.title')],
            ['greeting', i18n('$.email.greeting')],
            ['description', i18n('$.email.positionChanged.description')],
            ['previous', i18n('$.email.positionChanged.previous')],
            ['old_position', capitalCase(oldPosition)],
            ['new', i18n('$.email.positionChanged.new')],
            ['new_position', capitalCase(newPosition)],
            ['warning', i18n('$.email.positionChanged.warning')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}

export function sendIconTypeChangeEmail(address: string, oldIcon: string, newIcon: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('$.email.iconChanged.subject'),
        template: MailTemplate.IconChanged,
        variables: [
            ['title', i18n('$.email.iconChanged.title')],
            ['greeting', i18n('$.email.greeting')],
            ['description', i18n('$.email.iconChanged.description')],
            ['previous', i18n('$.email.iconChanged.previous')],
            ['old_icon', capitalCase(oldIcon)],
            ['new', i18n('$.email.iconChanged.new')],
            ['new_icon', capitalCase(newIcon)],
            ['warning', i18n('$.email.iconChanged.warning')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}

export function sendIconClearEmail(address: string, i18n: I18nFunction) {
    sendEmail({
        recipient: address,
        subject: i18n('$.email.iconCleared.subject'),
        template: MailTemplate.IconCleared,
        variables: [
            ['title', i18n('$.email.iconCleared.title')],
            ['greeting', i18n('$.email.greeting')],
            ['description', i18n('$.email.iconCleared.description')],
            ['warning', i18n('$.email.iconCleared.warning')],
            ['footer', i18n('$.email.footer')],
        ]
    });
}