"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayList = void 0;
const Song_1 = require("./Structures/Song");
const FullTimeSongs_1 = require("../Functions/FullTimeSongs");
const Colors_1 = require("../../../../../Core/Utils/Colors");
const Helper_1 = require("../../Events/Message/Constructor/Helper");
const CreateQueue_1 = require("./CreateQueue");
async function PlayList(message, playlist, VoiceChannel) {
    if (!playlist.items)
        return message.client.Send({ text: `${message.author}, Я не смог загрузить этот плейлист, Ошибка: Здесь больше 100 треков, youtube не позволит сделать мне столько запросов!`, message: message, color: "RED" });
    SendMessage(message, playlist).catch(async (err) => console.log(`[Discord Error]: [Send message]: ${err}`));
    return (await Promise.all([addSongsQueue(playlist.items, message, VoiceChannel)]))[0];
}
exports.PlayList = PlayList;
async function SendMessage(message, playlist) {
    return message.channel.send({ embeds: [await PlaylistEmbed(message, playlist, Colors_1.Colors.BLUE)] }).then(async (msg) => setTimeout(() => msg.delete().catch(() => null), 15e3));
}
async function addSongsQueue(playlistItems, message, VoiceChannel) {
    const { player } = message.client;
    let queue = message.client.queue.get(message.guild.id);
    return playlistItems.forEach((track) => setTimeout(async () => {
        if (!queue) {
            void player.emit('play', message, VoiceChannel, track);
            queue = message.client.queue.get(message.guild.id);
            return;
        }
        return (0, CreateQueue_1.PushSong)(queue, new Song_1.Song(track, message), false);
    }, 2e3));
}
async function PlaylistEmbed({ client, author: DisAuthor }, { author, image, url, title, items }, color) {
    return {
        color,
        author: {
            name: author?.title,
            iconURL: author?.image?.url ?? client.user.displayAvatarURL(),
            url: author?.url,
        },
        thumbnail: {
            url: typeof image === "string" ? image : image.url ?? Helper_1.NotImage
        },
        description: `Найден плейлист [${title}](${url})`,
        timestamp: new Date(),
        footer: {
            text: `${DisAuthor.username} | ${(0, FullTimeSongs_1.FullTimeSongs)(items)} | 🎶: ${items?.length}`,
            iconURL: DisAuthor.displayAvatarURL({}),
        }
    };
}
