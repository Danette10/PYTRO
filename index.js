import {Client, EmbedBuilder, GatewayIntentBits} from 'discord.js';
import config from './config.json' assert {type: 'json'};
import {commands} from './commands.js';

const { TOKEN, API_BASE_URL } = config;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('/help');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'help') {
        await interaction.deferReply({ ephemeral: true });
        // Display all available commands in a help embed
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
    }
});

client.login(TOKEN);