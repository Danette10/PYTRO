import {EmbedBuilder} from 'discord.js';

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