const { Client, IntentsBitField, Partials, Collection } = require(`discord.js`);
const { readdirSync, existsSync } = require(`fs`);
global.bot = {};
bot.client = new Client({
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

// Config
bot.cfg = server.cfg.bot;

// Colors
bot.colors = {
    standart: 0x2b2d31,
    success: 0x00ee00,
    error: 0xff0000
};

// Handlers
bot.commands = new Collection();
bot.buttons = new Collection();
bot.menus = new Collection();
bot.modals = new Collection();

(async () => {
    if(existsSync(`./bot/events`)) readdirSync(`./bot/events`).filter(file => file.endsWith(`.js`)).forEach(file => {
        const event = require(`./events/${file}`);

        if(event.once) {
            bot.client.once(event.name, event.action);
        } else {
            bot.client.on(event.name, event.action);
        }
    });
    if(existsSync(`./bot/commands`)) readdirSync(`./bot/commands`).filter(file => file.endsWith(`.js`)).forEach(file => {
        const cmd = require(`./commands/${file}`);

        bot.commands.set(cmd.name, cmd);
    });
    if(existsSync(`./bot/buttons`)) readdirSync(`./bot/buttons`).filter(file => file.endsWith(`.js`)).forEach(file => {
        const btn = require(`./buttons/${file}`);

        bot.buttons.set(btn.id, btn);
    });
    if(existsSync(`./bot/modals`)) readdirSync(`./bot/modals`).filter(file => file.endsWith(`.js`)).forEach(file => {
        const modal = require(`./modals/${file}`);

        bot.modals.set(modal.id, modal);
    });
})();

bot.client.login(bot.cfg.token);