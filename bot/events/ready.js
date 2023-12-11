const { ActivityType, REST, Routes } = require("discord.js");

module.exports = {
    name: `ready`,
    once: true,

    async action() {
        console.log(`[BOT] Logged in as ${bot.client.user.tag}`);

        bot.client.user.setActivity({
            name: `🔗 ${(await server.db.players.find()).filter((player) => !!player.tag).length} Global Tags`,
            type: ActivityType.Custom
        });

        registerCommands();
    }
}

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(bot.client.token);
    const commands = [];

    bot.commands.forEach(command => {
        commands.push({
            name: command.name,
            description: command.description,
            options: command.options,
            dm_permission: false
        });
    });
    console.log(`[BOT] All commands loaded!`);

    await (async () => {
        try {
            await rest.put(Routes.applicationCommands(bot.client.user.id), { body: commands });
            console.log(`[BOT] All commands registered!`);
        } catch (error) {
            console.error(error);
        }
    })();
}