import {DiscordAPIError, VoiceChannel} from "discord.js";
import {FullTimeSongs} from "../Duration/FullTimeSongs";
import {ClientMessage} from "../../../Client";
import {EmbedConstructor, InputPlaylist} from "../../../Utils/TypeHelper";
import {Colors} from "../../../Utils/Colors";
import {NotImage} from "../../Structures/Message/Helper";

/**
 * @description Отправляет сообщение сколько было добавлено, после добавляет музыку в очередь
 * @param message {ClientMessage} Сообщение с сервера
 * @param playlist {InputPlaylist} Сам плейлист
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 */
export function PlayList(message: ClientMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel): void {
    if (!playlist.items) return message.client.Send({
        text: `${message.author}, Я не смог загрузить этот плейлист, Ошибка: Здесь больше 100 треков, youtube не позволит сделать мне столько запросов!`,
        message,
        color: "RED"
    });

    SendMessage(message, playlist).catch((err: DiscordAPIError) => console.log(`[Discord Error]: [Send message]: ${err}`));
    return void message.client.player.emit("play", message, VoiceChannel, playlist.items);
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем сообщение с информацией плейлиста
 * @param message {ClientMessage} Сообщение с сервера
 * @param playlist {object} Сам плейлист
 */
function SendMessage(message: ClientMessage, playlist: InputPlaylist): Promise<NodeJS.Timeout> {
    return message.channel.send({embeds: [PlaylistEmbed(message, playlist, Colors.BLUE)]}).then((msg: ClientMessage) => setTimeout(() => msg.delete().catch(() => null), 15e3));
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем Embed сообщение для отправки в чат
 * @param client {WatKLOK} Бот
 * @param DisAuthor {ClientMessage.author} Автор сообщения
 * @param author {InputPlaylist.author} Автор плейлиста
 * @param image {InputPlaylist.image} Картинка плейлиста
 * @param url {InputPlaylist.url} Ссылка на плейлист
 * @param title {InputPlaylist.title} Название плейлиста
 * @param items {InputPlaylist.items} Треки плейлиста
 * @param color {number} Цвет левой части embed
 */
function PlaylistEmbed({client, author: DisAuthor}: ClientMessage, {author, image, url, title, items}: InputPlaylist, color: number): EmbedConstructor {
    return {
        color,
        author: {
            name: author?.title,
            iconURL: author?.image?.url ?? NotImage,
            url: author?.url,
        },
        thumbnail: {
            url: typeof image === "string" ? image : image.url ?? NotImage
        },
        description: `Найден плейлист [${title}](${url})`,
        timestamp: new Date(),
        footer: {
            text: `${DisAuthor.username} | ${FullTimeSongs(items)} | 🎶: ${items?.length}`,
            iconURL: DisAuthor.displayAvatarURL({}),
        }
    };
}