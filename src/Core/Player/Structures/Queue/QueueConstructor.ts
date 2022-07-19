import {VoiceChannel} from "discord.js";
import {ClientMessage} from "../../../Client";
import {InputPlaylist, InputTrack} from "../../../Utils/TypeHelper";
import {Queue} from "./Queue";
import {Song} from "./Song";
import {Voice} from "../Voice";
import {MessagePlayer} from "../../Manager/MessagePlayer";
import {TypedEmitter} from "tiny-typed-emitter";
import {AudioPlayer} from "../../Audio/AudioPlayer";

/**
 * Что можно сделать с очередью (в будущем будет дорабатываться)
 */
export namespace QueueConstructor {
    /**
     * @description Проверяем что надо сделать с очередью
     * @param message {ClientMessage} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} К какому голосовому каналу надо подключатся
     * @param info {InputTrack | InputPlaylist} Входные данные это трек или плейлист?
     * @requires {CreateQueue, PushSong}
     * @constructor
     */
    export function CheckQueue(message: ClientMessage, VoiceChannel: VoiceChannel, info: InputTrack | InputPlaylist) {
        const Queue = CreateQueue(message, VoiceChannel);

        //Если поступает плейлист
        if ("items" in info) {
            MessagePlayer.pushPlaylist(message, info);
            setImmediate(() => info.items.forEach((track) => PushSong(Queue, track, false)));
            return;
        }

        //Добавляем песню в очередь
        PushSong(Queue, info, Queue.songs.length >= 1);
        if (Queue.songs.length === 1) return Queue.player.PlayCallback(message);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем очереди или если она есть выдаем
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} К какому голосовому каналу надо подключатся
 * @constructor
 */
function CreateQueue(message: ClientMessage, VoiceChannel: VoiceChannel) {
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
    const song: Song = new Song(InputTrack, queue.channels.message);

    queue.songs.push(song);
    if (sendMessage) setImmediate(() => MessagePlayer.pushSong(queue.channels.message, song));
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Нужно только для того что-бы удалить очередь один раз)
 */
export class QueueEvents extends TypedEmitter<Events> {
    Timer: NodeJS.Timeout;
    hasDestroying: boolean;

    public constructor() {
        super();
        this.once("DeleteQueue", onDeleteQueue);
        this.on("StartDelete", this.#onStartDelete);
        this.on("CancelDelete", this.#onCancelDelete);
        this.setMaxListeners(3);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем таймер (по истечению таймера будет удалена очередь)
     * @param queue {object} Очередь сервера
     */
    readonly #onStartDelete = (queue: Queue): void => {
        this.Timer = setTimeout(() => {
            this.emit("DeleteQueue", queue.channels.message, false);
        }, 30e3);
        this.hasDestroying = true;
        queue.player.pause();
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем таймер который удаляет очередь
     * @param player {AudioPlayer} Плеер
     */
    readonly #onCancelDelete = (player: AudioPlayer): void => {
        if (this.hasDestroying) {
            clearTimeout(this.Timer);
            player.resume();
            this.hasDestroying = false;
        }
    };
    readonly cleanup = () => {
        clearTimeout(this.Timer);

        delete this.hasDestroying;
        delete this.Timer;
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Удаление очереди
 * @param message {ClientMessage} Сообщение с сервера
 * @param sendDelQueue {boolean} Отправить сообщение об удалении очереди
 * @requires {sendMessage}
 */
function onDeleteQueue(message: ClientMessage, sendDelQueue: boolean = true) {
    const {client, guild} = message;
    const Queue = client.queue.get(guild.id);

    //Если нет очереди
    if (!Queue) return;

    //Удаляем сообщение о текущем треке
    if (Queue.channels.message?.deletable) Queue.channels.message?.delete().catch(() => undefined);
    if (Queue.player) Queue.player.stop();
    [Queue.songs, Queue.audioFilters].forEach(data => data = null);

    if (sendDelQueue) {
        if (Queue.options.stop) sendMessage(message, "🎵 | Музыка была выключена");
        else sendMessage(message, "🎵 | Музыка закончилась");
    }

    Queue.emitter.cleanup();
    client.queue.delete(guild.id);
}
//Отправляем сообщение в тестовый канал
function sendMessage(message: ClientMessage, text: string) {
    return message.client.Send({text, message, type: "css"});
}

interface Events {
    DeleteQueue: (message: ClientMessage, sendDelQueue?: boolean) => void;
    StartDelete: (queue: Queue) => void;
    CancelDelete: (player: AudioPlayer) => void;
}