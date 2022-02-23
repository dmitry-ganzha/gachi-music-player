import {DiscordAPIError, VoiceChannel} from "discord.js";
import {Song} from "./Structures/Song";
import {FullTimeSongs} from "../Functions/FullTimeSongs";
import {EmbedConstructor, InputPlaylist, InputTrack, wMessage} from "../../../../../Core/Utils/TypesHelper";
import {Colors} from "../../../../../Core/Utils/Colors";
import {NotImage} from "../../Events/Message/Constructor/Helper";

export class PlayList {
    /**
     * @description Добавляет музыку в очередь, после отправляет сообщение сколько было добавлено
     * @param message {wMessage} Сообщение с сервера
     * @param playlist {object} Сам плейлист
     * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
     */
    public pushItems = (message: wMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel): Promise<void> | void => {
        if (!playlist.items) return message.client.Send({text: `${message.author}, Я не смог загрузить этот плейлист, Ошибка: Здесь больше 100 треков, youtube не позволит сделать мне столько запросов!`, message: message, color: "RED"});

        PlayList.SendMessage(message, playlist).catch(async (err: DiscordAPIError) => console.log(`[Discord Error]: [Send message]: ${err}`));
        return PlayList.addSongsQueue(playlist.items, message, VoiceChannel);
    };
    /**
     * @description Отправляем сообщение с информацией плейлиста
     * @param message {wMessage} Сообщение с сервера
     * @param playlist {object} Сам плейлист
     */
    protected static SendMessage = async (message: wMessage, playlist: InputPlaylist): Promise<NodeJS.Timeout> => message.channel.send({embeds: [await PlaylistEmbed(message, playlist, Colors.BLUE)]}).then(async (msg: wMessage) => setTimeout(() => msg.delete().catch(() => null), 15e3));
    /**
     * @description Добавляем музыку в очередь
     * @param playlistItems {any[]} Список музыки плейлиста
     * @param message {wMessage} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
     */
    protected static addSongsQueue = (playlistItems: InputTrack[], message: wMessage, VoiceChannel: VoiceChannel): void => {
        const {queue, player} = message.client;

        return playlistItems.forEach((track: InputTrack) => setTimeout(async () => {
            if (!queue.get(message.guild.id)) return void player.emit('play', message, VoiceChannel, track);

            return void message.client.queue.get(message.guild.id).events.queue.emit('pushSong', new Song(track, message), message);
        }, 2e3));
    };
}

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
            text: `${DisAuthor.username} | ${FullTimeSongs(items)} | 🎶: ${items?.length}`,
            iconURL: DisAuthor.displayAvatarURL({}),
        }
    };
}