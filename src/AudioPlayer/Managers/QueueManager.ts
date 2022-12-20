import {InputPlaylist, InputTrack, Song} from "@Queue/Song";
import {ClientMessage} from "@Client/interactionCreate";
import {MessagePlayer} from "./PlayerMessages";
import {VoiceChannel} from "discord.js";
import {Voice} from "@VoiceManager";
import {Queue} from "@Queue/Queue";

//Что можно сделать с очередью (в будущем будет дорабатываться)
export namespace QueueManager {
    /**
     * @description Добавляем плейлист или трек в очередь
     * @param message {ClientMessage} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} К какому голосовому каналу надо подключатся
     * @param info {InputTrack | InputPlaylist} Входные данные это трек или плейлист?
     * @requires {CreateQueue}
     */
    export function toQueue(message: ClientMessage, VoiceChannel: VoiceChannel, info: InputTrack | InputPlaylist): void {
        const {queue, status} = CreateQueue(message, VoiceChannel);
        const requester = message.author;

        setImmediate(() => {
            //Если поступает плейлист
            if ("items" in info) {
                MessagePlayer.toPushPlaylist(message, info);
                //Добавляем треки в очередь
                info.items.forEach((track) => queue.push(new Song(track, requester)));
            } else queue.push(new Song(info, requester), queue.songs.length >= 1); //Добавляем трек в очередь

            //Запускаем callback плеера, если очередь была создана, а не загружена!
            if (status === "create") queue.play();
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем очереди или если она есть выдаем
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} К какому голосовому каналу надо подключатся
 */
function CreateQueue(message: ClientMessage, VoiceChannel: VoiceChannel): { status: "create" | "load", queue: Queue } {
    const {client, guild} = message;
    const queue = client.queue.get(guild.id);

    if (queue) return {queue, status: "load"};

    //Создаем очередь
    const GuildQueue = new Queue(message, VoiceChannel);
    const connection = Voice.Join(VoiceChannel); //Подключаемся к голосовому каналу

    GuildQueue.player.voice(connection); //Добавляем подключение в плеер
    client.queue.set(guild.id, GuildQueue); //Записываем очередь в <client.queue>

    return {queue: GuildQueue, status: "create"};
}