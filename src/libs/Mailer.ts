import { TransportOptions, createTransport } from "nodemailer";
import { mailer } from "../../config.json";
import { join } from "path";
import Logger from "./Logger";

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

export async function send({ recipient, subject, template, variables = [] }: MailOptions) {
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