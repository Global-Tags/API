import { Client, Collection, IntentsBitField } from "discord.js";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages
    ],
    allowedMentions: {
        parse: [`users`, `roles`],
        repliedUser: true
    }
});

export const colors = {
    standart: 0x2b2d31,
    success: 0x00ee00,
    error: 0xff0000
};

export const commands = new Collection();
export const buttons = new Collection();
export const menus = new Collection();
export const modals = new Collection();

(async () => {
    const eventDir = join(__dirname, `events`);
    const commandDir = join(__dirname, `commands`);
    const buttonDir = join(__dirname, `buttons`);
    const modalDir = join(__dirname, `modals`);
    if(existsSync(eventDir)) readdirSync(eventDir).filter(file => file.endsWith(`.js`)).forEach(file => {
        const event = require(join(eventDir, file));

        if(event.once) {
            client.once(event.name, event.action);
        } else {
            client.on(event.name, event.action);
        }
    });
    if(existsSync(commandDir)) readdirSync(commandDir).filter(file => file.endsWith(`.js`)).forEach(file => {
        const cmd = require(join(commandDir, file));

        commands.set(cmd.name, cmd);
    });
    if(existsSync(buttonDir)) readdirSync(buttonDir).filter(file => file.endsWith(`.js`)).forEach(file => {
        const btn = require(join(buttonDir, file));

        buttons.set(btn.id, btn);
    });
    if(existsSync(modalDir)) readdirSync(modalDir).filter(file => file.endsWith(`.js`)).forEach(file => {
        const modal = require(join(modalDir, file));

        modals.set(modal.id, modal);
    });
})();