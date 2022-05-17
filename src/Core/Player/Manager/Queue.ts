import {ClientMessage} from "../../Client";
import {InputTrack} from "../../Utils/TypeHelper";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {Disconnect, JoinVoiceChannel} from "./Voice/VoiceManager";
import {PushSongMessage} from "./PlayerMessages";
import {VoiceChannel} from "discord.js";
import {TypedEmitter} from "tiny-typed-emitter";

type EventsQueue = {
    DestroyQueue: (queue: Queue, message: ClientMessage, sendDelQueue?: boolean) => boolean | void,
};
export type Queue_Channels = Queue["channels"];
export type Queue_Options = Queue["options"];


//====================== ====================== ====================== ======================
/**
 * @description Выбираем что сделать создать базу для сервера или добавить в базу музыку
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param tracks {any} Сама музыка
 */
export function CreateQueue(message: ClientMessage, VoiceChannel: VoiceChannel, tracks: InputTrack | InputTrack[]): boolean | void | Promise<void | ClientMessage | NodeJS.Timeout> {
    let queue: Queue = message.client.queue.get(message.guild.id);

    //Если поступает InputTrack[]
    if (tracks instanceof Array) {
        return tracks.forEach((track) => setTimeout(() => setImmediate(() => {
            const song: Song = new Song(track, message);

            //Если нет очереди
            if (!queue) {
                CreateQueueGuild(message, VoiceChannel, song);
                queue = message.client.queue.get(message.guild.id);
                return;
            }
            return PushSong(queue, song, false);
        }), 2e3));
    }

    //Если поступает InputTrack
    setImmediate(() => {
        const song: Song = new Song(tracks, message);

        if (!queue) return CreateQueueGuild(message, VoiceChannel, song);
        return PushSong(queue, song);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем очередь для сервера
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param song {Song} Сам трек
 */
function CreateQueueGuild(message: ClientMessage, VoiceChannel: VoiceChannel, song: Song): void {
    const {client, guild} = message;

    if (client.queue.get(message.guild.id)) return;
    client.console(`[Queue]: [GuildID: ${guild.id}, Status: Create]`);

    const GuildQueue = new Queue(message, VoiceChannel);
    const connection = JoinVoiceChannel(VoiceChannel);
    client.queue.set(guild.id, GuildQueue);
    const queue = client.queue.get(message.guild.id);

    PushSong(queue, song, false);

    queue.player.subscribe(connection);
    queue.channels.connection = connection;

    return queue.player.PlayCallback(message);
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем музыку в базу сервера и отправляем что было добавлено
 * @param queue {Queue} Очередь с сервера
 * @param song {Song} Сам трек
 * @param sendMessage {boolean} Отправить сообщение?
 */
export function PushSong(queue: Queue, song: Song, sendMessage: boolean = true): void {
    queue.songs.push(song);
    setImmediate(() => {
        if (sendMessage) PushSongMessage(queue.channels.message, song);
    });
}

//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Потом что-то напишу)
 */
export class QueueEvents extends TypedEmitter<EventsQueue> {
    public constructor() {
        super();
        this.once('DestroyQueue', onDestroyQueue);
        this.setMaxListeners(1);
    };

    public destroy = () => {
        this.removeAllListeners();
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Удаление очереди
 * @param queue {object} Очередь сервера
 * @param message {object} Сообщение с сервера
 * @param sendDelQueue {boolean} Отправить сообщение об удалении очереди
 */
function onDestroyQueue(queue: Queue, message: ClientMessage, sendDelQueue: boolean = true): boolean | void {
    if (!queue) return;

    DeleteMessage(queue.channels);
    Disconnect(queue?.channels?.message?.guild.id);
    CleanPlayer(queue);
    if (sendDelQueue) SendChannelToEnd(queue.options, message);

    delete queue.songs;
    delete queue.audioFilters;
    delete queue.options;
    delete queue.channels;

    queue.events.queue.destroy();
    queue.events.helper.destroy();
    delete queue.events;

    return DeleteQueue(message);
}
//====================== ====================== ====================== ======================
/**
 * @description Завершаем воспроизведение в player
 * @param queue {Queue}
 */
function CleanPlayer(queue: Queue): void {
    if (queue.player.state.resource) void queue.player.state.resource.destroy();

    queue.player?.stop();

    setImmediate(() => {
        queue.player.unsubscribe(null);
        queue.player?.removeAllListeners();
        queue.player.destroy();
        delete queue.player;
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение о текущей песне
 * @param channels {Queue_Channels} Все каналы из очереди
 */
function DeleteMessage({message}: Queue_Channels): NodeJS.Timeout {
    return setTimeout(() => message?.deletable ? message?.delete().catch(() => undefined) : null, 3e3);
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем сообщение, что музыка завершена
 * @param options {Queue_Options} Опции из очереди
 * @param message {ClientMessage} Сообщение с сервера
 */
function SendChannelToEnd({stop}: Queue_Options, message: ClientMessage): void {
    if (stop) return message.client.Send({text: `🎵 | Музыка была выключена`, message, type: 'css'});
    return message.client.Send({text: `🎵 | Музыка закончилась`, message, type: 'css'});
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем очередь
 * @param message {ClientMessage} Сообщение с сервера
 */
function DeleteQueue(message: ClientMessage): boolean {

    message.client.console(`[Queue]: [GuildID: ${message.guild.id}, Status: Delete]`);
    return message.client.queue.delete(message.guild.id);
}