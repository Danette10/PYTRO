import {REST, Routes} from 'discord.js';
import config from './static/config.json' assert {type: 'json'};

const { TOKEN, CLIENT_ID } = config;

export const commands = [
    {
        name: 'help',
        description: 'Affiche la liste des commandes disponibles.',
    },
    {
        name: 'screenshot',
        description: 'Envoie une commande pour prendre une capture d\'écran d\'un client spécifique.',
        options: [
            {
                name: 'client_id',
                description: 'Le numéro du client.',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'clients',
        description: 'Liste des clients.',
        options: [
            {
                name: 'status',
                description: 'Filtrer les clients par statut.',
                type: 3,
                required: false,
                choices: [
                    {
                        name: 'En ligne',
                        value: 'online',
                    },
                    {
                        name: 'Hors ligne',
                        value: 'offline',
                    },
                ],
            },
        ],
    },
    {
        name: 'stop',
        description: 'Arrêt du bot.',
    },
    {
        name: 'listallscreenshots',
        description: 'Liste de toutes les captures d\'écran.',
    },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
    console.log('Début de la mise à jour des commandes de l\'application (/).');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log('Commandes de l\'application (/) mises à jour avec succès.');
} catch (error) {
    console.error(error);
}