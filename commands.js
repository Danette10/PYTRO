import {REST, Routes} from 'discord.js';
import config from './config.json' assert {type: 'json'};

const { TOKEN, CLIENT_ID } = config;

export const commands = [
    {
        name: 'help',
        description: 'Replies with a help message.',
    },
    {
        name: 'screenshot',
        description: 'Sends a command to take a screenshot.',
        options: [
            {
                name: 'ip',
                description: 'The IP address of the client.',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'clients',
        description: 'Lists all clients.',
        options: [
            {
                name: 'status',
                description: 'Filter by status.',
                type: 3,
                required: false,
                choices: [
                    {
                        name: 'Online',
                        value: 'online',
                    },
                    {
                        name: 'Offline',
                        value: 'offline',
                    },
                ],
            },
        ],
    },
    {
        name: 'stop',
        description: 'Stop the bot.',
    },
    {
        name: 'listallscreenshots',
        description: 'List all screenshots.',
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