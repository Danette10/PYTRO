import {EmbedBuilder} from 'discord.js';

// Fonction pour créer un embed Discord personnalisé
export function createEmbed(title, description, fields = [], color = '#2f6d2d', attachment = null) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (fields.length) embed.addFields(fields);
    if (attachment) embed.setImage(attachment);

    return embed;
}

// Fonction pour vérifier si l'id d'un client saisi est valide
export function isClientNumberValid(clientId) {
    return !isNaN(clientId) && clientId > 0;
}