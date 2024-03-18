import {REST, Routes} from 'discord.js';
import config from './config.json' assert {type: 'json'};

const { TOKEN, CLIENT_ID } = config;

export const commands = [
    {
        name: 'help',
        description: 'Replies with a help message.',
    },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}