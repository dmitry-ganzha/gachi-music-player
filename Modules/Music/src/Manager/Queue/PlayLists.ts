import {ColorResolvable, HexColorString, MessageEmbed} from "discord.js";
import {Song} from "./Constructors/Song";
import {FullTimeSongs} from "../Functions/FullTimeSongs";
import {VoiceConnection} from "@discordjs/voice";
import {W_Message, playlist} from "../../../../../Core/Utils/W_Message";

export class PlayList {
    /**
     * @description Добавляет музыку в очередь, после отправляет сообщение сколько было добавлено
     * @param message {W_Message} Сообщение с сервера
     * @param playlist {object} Сам плейлист
     * @param VoiceConnection {VoiceConnection} Подключение к голосовому каналу
     */
    public pushItems = async (message: W_Message, playlist: playlist, VoiceConnection: VoiceConnection): Promise<void> => {
        if (!playlist.items) return message.client.Send({text: `${message.author}, Я не смог загрузить этот плейлист, Ошибка: Здесь больше 100 треков, youtube не позволит сделать мне столько запросов!`, message: message, color: "RED"});

        this.SendMessage(message, playlist).catch(async (err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
        return this.addSongsQueue(playlist.items, message, VoiceConnection);
    }
    /**
     * @description Отправляем сообщение с информацией плейлиста
     * @param message {W_Message} Сообщение с сервера
     * @param playlist {object} Сам плейлист
     */
    private SendMessage = async (message: W_Message, playlist: playlist): Promise<NodeJS.Timeout> => message.channel.send({embeds: [new PlaylistEmbed(message, playlist, '#03fcdf')]}).then(async (msg) => setTimeout(() => msg.delete().catch(() => null), 15e3));
    /**
     * @description Добавляем музыку в очередь
     * @param playlistItems {any[]} Список музыки плейлиста
     * @param message {W_Message} Сообщение с сервера
     * @param VoiceConnection {VoiceConnection} Подключение к голосовому каналу
     */
    private addSongsQueue = async (playlistItems: any[], message: W_Message, VoiceConnection: VoiceConnection): Promise<void> => {
        let {queue, player} = message.client;

        return playlistItems.forEach((track) => setTimeout(async () => {
            if (!queue.get(message.guild.id)) return player.emit('play', message, VoiceConnection, track);
            return message.client.queue.get(message.guild.id).events.queue.emit('pushSong', new Song(track, message), message);
        }, 2e3));
    }
}

class PlaylistEmbed extends MessageEmbed {
    constructor(message: W_Message, {author, thumbnail, url, title, items}: playlist, color: HexColorString | ColorResolvable) {
        super({
            color: color,
            author: {
                name: author?.name || author?.title,
                icon_url: author?.thumbnails?.url || message.client.user.displayAvatarURL(),
                url: author?.url,
            },
            thumbnail: {
                url: !thumbnail?.url ? thumbnail : thumbnail?.url,
            },
            description: `Найден плейлист [${title}](${url})`,
            timestamp: new Date(),
            footer: {
                text: `${message.author.username} | ${FullTimeSongs(items)} | 🎶: ${items?.length}`,
                icon_url: message.author.displayAvatarURL({}),
            }
        });
    };
}