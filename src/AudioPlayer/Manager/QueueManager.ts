import {VoiceChannel} from "discord.js";
import {InputPlaylist, InputTrack} from "../../Core/Utils/TypeHelper";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {Voice} from "../Structures/Voice";
import {MessagePlayer} from "./MessagePlayer";
import {ClientMessage} from "../../Handler/Events/Activity/Message";

/**
 * Что можно сделать с очередью (в будущем будет дорабатываться)
 */
export namespace QueueManager {
    /**
     * @description Добавляем плейлист или трек в очередь
     * @param message {ClientMessage} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} К какому голосовому каналу надо подключатся
     * @param info {InputTrack | InputPlaylist} Входные данные это трек или плейлист?
     * @requires {CreateQueue, PushSong}
     * @constructor
     */
    export function toQueue(message: ClientMessage, VoiceChannel: VoiceChannel, info: InputTrack | InputPlaylist): void {
        const Queue = CreateQueue(message, VoiceChannel);

        //Если поступает плейлист
        if ("items" in info) {
            MessagePlayer.toPushPlaylist(message, info);
            setImmediate(() => {
                info.items.forEach((track) => PushSong(Queue, track, false));
                return Queue.player.play(message);
            });
            return;
        }

        //Добавляем трек в очередь
        PushSong(Queue, info, Queue.songs.length >= 1);
        setImmediate(() => {
            if (Queue.songs.length <= 1) return Queue.player.play(message);
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем очереди или если она есть выдаем
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} К какому голосовому каналу надо подключатся
 * @constructor
 */
function CreateQueue(message: ClientMessage, VoiceChannel: VoiceChannel): Queue {
    const {client, guild} = message;
    const queue = client.queue.get(guild.id);

    if (queue) return queue;

    //Создаем очередь
    const GuildQueue = new Queue(message, VoiceChannel);
    const connection = Voice.Join(VoiceChannel);

    GuildQueue.channels.connection = connection;
    GuildQueue.player.subscribe(connection);

    client.queue.set(guild.id, GuildQueue); //Записываем очередь в <client.queue>

    return GuildQueue;
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем музыку в базу сервера и отправляем что было добавлено
 * @param queue {Queue} Очередь с сервера
 * @param InputTrack {InputTrack} Сам трек
 * @param sendMessage {boolean} Отправить сообщение?
 */
function PushSong(queue: Queue, InputTrack: InputTrack, sendMessage: boolean = true): void {
    const song: Song = new Song(InputTrack, queue.channels.message.author);

    queue.songs.push(song);
    if (sendMessage) setImmediate(() => MessagePlayer.toPushSong(queue.channels.message, song));
}