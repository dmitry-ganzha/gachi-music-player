"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayList = void 0;
const Helper_1 = require("../Structures/Message/Helper");
const LiteUtils_1 = require("../../Utils/LiteUtils");
const DurationUtils_1 = require("./DurationUtils");
function PlayList(message, playlist, VoiceChannel) {
    if (!playlist.items)
        return message.client.Send({
            text: `${message.author}, Я не смог загрузить этот плейлист, Ошибка: Здесь больше 100 треков, youtube не позволит сделать мне столько запросов!`,
            message,
            color: "RED"
        });
    SendMessage(message, playlist).catch((err) => console.log(`[Discord Error]: [Send message]: ${err}`));
    return void message.client.player.emit("play", message, VoiceChannel, playlist.items);
}
exports.PlayList = PlayList;
function SendMessage(message, playlist) {
    return message.channel.send({ embeds: [PlaylistEmbed(message, playlist, LiteUtils_1.Colors.BLUE)] }).then((msg) => setTimeout(() => msg.delete().catch(() => null), 15e3));
}
function PlaylistEmbed({ client, author: DisAuthor }, { author, image, url, title, items }, color) {
    return {
        color,
        author: {
            name: author?.title,
            iconURL: author?.image?.url ?? Helper_1.NotImage,
            url: author?.url,
        },
        thumbnail: {
            url: typeof image === "string" ? image : image.url ?? Helper_1.NotImage
        },
        description: `Найден плейлист [${title}](${url})`,
        timestamp: new Date(),
        footer: {
            text: `${DisAuthor.username} | ${(0, DurationUtils_1.TimeInArray)(items)} | 🎶: ${items?.length}`,
            iconURL: DisAuthor.displayAvatarURL({}),
        }
    };
}
