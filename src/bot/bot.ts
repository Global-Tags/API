import { Client, Collection, IntentsBitField } from "discord.js";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import Event from "./structs/Event";
import Command from "./structs/Command";
import Modal from "./structs/Modal";
import Button from "./structs/Button";
import SelectMenu from "./structs/SelectMenu";
import { config } from "../libs/Config";

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

export const images = {
    roles: 'https://cdn.rappytv.com/bots/globaltags/roles.png',
    placeholder: 'https://cdn.rappytv.com/bots/placeholder.png'
}

export const commands = new Collection<string, Command>();
export const buttons = new Collection<string, Button>();
export const menus = new Collection<string, SelectMenu>();
export const modals = new Collection<string, Modal>();

(async () => {
    const eventDir = join(__dirname, `events`);
    const commandDir = join(__dirname, `commands`);
    const buttonDir = join(__dirname, `buttons`);
    const menuDir = join(__dirname, `menus`);
    const modalDir = join(__dirname, `modals`);
    if(existsSync(eventDir)) readdirSync(eventDir).filter(file => file.endsWith(`.ts`)).forEach(async file => {
        const event = new (await import(join(eventDir, file))).default as Event;

        if(event.once) {
            client.once(event.name, event.fire);
        } else {
            client.on(event.name, event.fire);
        }
    });
    if(existsSync(commandDir)) readdirSync(commandDir).filter(file => file.endsWith(`.ts`)).forEach(async file => {
        const cmd = new (await import(join(commandDir, file))).default as Command;

        commands.set(cmd.name, cmd);
    });
    if(existsSync(buttonDir)) readdirSync(buttonDir).filter(file => file.endsWith(`.ts`)).forEach(async file => {
        const btn = new (await import(join(buttonDir, file))).default as Button;

        buttons.set(btn.id, btn);
    });
    if(existsSync(menuDir)) readdirSync(menuDir).filter(file => file.endsWith(`.ts`)).forEach(async file => {
        const menu = new (await import(join(menuDir, file))).default as SelectMenu;

        menus.set(menu.id, menu);
    });
    if(existsSync(modalDir)) readdirSync(modalDir).filter(file => file.endsWith(`.ts`)).forEach(async file => {
        const modal = new (await import(join(modalDir, file))).default as Modal;

        modals.set(modal.id, modal);
    });
})();

export const spawn = () => client.login(config.discordBot.token);
export const destroy = () => client.destroy();