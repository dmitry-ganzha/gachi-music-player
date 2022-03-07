import {DiscordAPIError, VoiceChannel} from "discord.js";
import {Song} from "./Structures/Song";
import {AsyncFullTimeSongs} from "../Functions/FullTimeSongs";
import {EmbedConstructor, InputPlaylist, InputTrack, wMessage} from "../../../../../Core/Utils/TypesHelper";
import {Colors} from "../../../../../Core/Utils/Colors";
import {NotImage} from "../../Events/Message/Constructor/Helper";
import {PushSong} from "./CreateQueue";

//====================== ====================== ====================== ======================
/**
 * @description Добавляет музыку в очередь, после отправляет сообщение сколько было добавлено
 * @param message {wMessage} Сообщение с сервера
 * @param playlist {object} Сам плейлист
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 */
export async function PlayList(message: wMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel): Promise<void> {
    if (!playlist.items) return message.client.Send({text: `${message.author}, Я не смог загрузить этот плейлист, Ошибка: Здесь больше 100 треков, youtube не позволит сделать мне столько запросов!`, message: message, color: "RED"});

    SendMessage(message, playlist).catch(async (err: DiscordAPIError) => console.log(`[Discord Error]: [Send message]: ${err}`));
    return addSongsQueue(playlist.items, message, VoiceChannel);
}
//====================== ====================== ====================== ======================

/**
 * @description Отправляем сообщение с информацией плейлиста
 * @param message {wMessage} Сообщение с сервера
 * @param playlist {object} Сам плейлист
 */
async function SendMessage(message: wMessage, playlist: InputPlaylist): Promise<NodeJS.Timeout> {
   return message.channel.send({embeds: [await PlaylistEmbed(message, playlist, Colors.BLUE)]}).then(async (msg: wMessage) => setTimeout(() => msg.delete().catch(() => null), 15e3));
}
//====================== ====================== ====================== ======================

/**
 * @description Добавляем музыку в очередь
 * @param playlistItems {any[]} Список музыки плейлиста
 * @param message {wMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 */
async function addSongsQueue(playlistItems: InputTrack[], message: wMessage, VoiceChannel: VoiceChannel): Promise<void> {
    const {player} = message.client;
    let queue = message.client.queue.get(message.guild.id)

    return playlistItems.forEach((track: InputTrack) => setTimeout(async () => {
        if (!queue) {
            void player.emit('play', message, VoiceChannel, track);
            queue = message.client.queue.get(message.guild.id);
            return;
        }

        return PushSong(queue, new Song(track, message), false);
    }, 2e3));
}
//====================== ====================== ====================== ======================

/**
 * @description Создаем Embed сообщение для отправки в чат
 * @param client {wClient} Бот
 * @param DisAuthor {wMessage.author} Автор сообщения
 * @param author {InputPlaylist.author} Автор плейлиста
 * @param image {InputPlaylist.image} Картинка плейлиста
 * @param url {InputPlaylist.url} Ссылка на плейлист
 * @param title {InputPlaylist.title} Название плейлиста
 * @param items {InputPlaylist.items} Треки плейлиста
 * @param color {number} Цвет левой части embed
 */
async function PlaylistEmbed({client, author: DisAuthor}: wMessage, {author, image, url, title, items}: InputPlaylist, color: number): Promise<EmbedConstructor> {
    return {
        color,
        author: {
            name: author?.title,
            iconURL: author?.image?.url ?? client.user.displayAvatarURL(),
            url: author?.url,
        },
        thumbnail: {
            url: typeof image === "string" ? image : image.url ?? NotImage
        },
        description: `Найден плейлист [${title}](${url})`,
        timestamp: new Date(),
        footer: {
            text: `${DisAuthor.username} | ${await AsyncFullTimeSongs(items)} | 🎶: ${items?.length}`,
            iconURL: DisAuthor.displayAvatarURL({}),
        }
    };
}
//====================== ====================== ====================== ======================