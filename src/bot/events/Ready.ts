import { ActivityType, REST, Routes } from "discord.js";
import Logger from "../../libs/Logger";
import Event from "../structs/Event";
import players from "../../database/schemas/players";
import * as bot from "../bot";
import { captureException } from "@sentry/bun";

export default class ReadyEvent extends Event {
    constructor() {
        super('ready', true);
    }

    public fire() {
        Logger.info(`Bot logged in as ${bot.client.user!.tag}`);
        bot.fetchGuild()?.then(g => g.members.fetch());

        setInterval(async () => {
            bot.client.user!.setActivity({
                name: `🔗 ${(await players.find()).filter((player) => !!player.tag).length} Global Tags`,
                type: ActivityType.Custom
            });
        }, 1000 * 60 * 30);
        registerCommands();
    }
}

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(bot.client.token!);
    const commands: { name: string, description: string, options: any, dm_permission: boolean }[] = [];

    bot.commands.forEach(command => {
        commands.push({
            name: command.name,
            description: command.description,
            options: command.options,
            dm_permission: false
        });
    });
    Logger.debug(`Loaded ${commands.length} commands!`);

    await (async () => {
        try {
            await rest.put(Routes.applicationCommands(bot.client.user!.id), { body: commands });
            Logger.debug(`Registered ${commands.length} commands!`);
        } catch (error) {
            captureException(error);
            Logger.error(error);
        }
    })();
}