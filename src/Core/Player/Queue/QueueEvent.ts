import {TypedEmitter} from "tiny-typed-emitter";
import {Song} from "./Structures/Song";
import {Queue} from "./Structures/Queue";
import {Disconnect} from "../Voice/VoiceManager";
import {ClientMessage} from "../../Client";

type EventsQueue = {
    DestroyQueue: (queue: Queue, message: ClientMessage, sendDelQueue?: boolean) => Promise<NodeJS.Timeout>,
    pushSong: (song: Song, message: ClientMessage) => Promise<number | null>
};
export type Queue_Channels = Queue["channels"];
export type Queue_Options = Queue["options"];

export class QueueEvents extends TypedEmitter<EventsQueue> {
    public constructor() {
        super();
        this.once('DestroyQueue', onDestroyQueue);
        this.on('pushSong', onPushSong);
        this.setMaxListeners(2);
    };

    public destroy = () => {
        this.removeAllListeners();
    };
}
/**
 * @description Добавляем музыку в очередь
 * @param song {object}
 * @param message {object}
 */
async function onPushSong(song: Song, {client, guild}: ClientMessage): Promise<number | null> {
    const queue: Queue = client.queue.get(guild.id);

    if (!queue) return null;
    queue.songs.push(song);
    return null;
}
/**
 * @description Удаление очереди
 * @param queue {object} Очередь сервера
 * @param message {object} Сообщение с сервера
 * @param sendDelQueue {boolean} Отправить сообщение об удалении очереди
 */
async function onDestroyQueue(queue: Queue, message: ClientMessage, sendDelQueue: boolean = true): Promise<NodeJS.Timeout> {
    if (!queue) return null;

    await DeleteMessage(queue.channels);
    await LeaveVoice(queue?.channels?.message?.guild.id);
    await CleanPlayer(queue);
    if (sendDelQueue) await SendChannelToEnd(queue.options, message);

    delete queue.songs;
    delete queue.audioFilters;
    delete queue.options;

    delete queue.channels;

    queue.events.queue.destroy();
    queue.events.helper.destroy();
    queue.events.message.destroy();
    delete queue.events;

    return DeleteQueue(message);
}
/**
 * @description Завершаем воспроизведение в player
 * @param queue {Queue}
 */
async function CleanPlayer(queue: Queue): Promise<void> {
    if (queue.player.state.resource) void queue.player.state.resource.playStream.emit('close');

    queue.player?.stop();

    setTimeout(() => {
        queue.player?.removeAllListeners();
        queue.player.destroy();
        delete queue.player;
    }, 7e3);
    return;
}
/**
 * @description Отключаемся от голосового канала
 * @param GuildID {string} ID сервера
 */
async function LeaveVoice(GuildID: string): Promise<void> {
    return Disconnect(GuildID);
}
/**
 * @description Удаляем сообщение о текущей песне
 * @param channels {Queue_Channels} Все каналы из очереди
 */
async function DeleteMessage({message}: Queue_Channels): Promise<NodeJS.Timeout> {
    return setTimeout(async () => message?.deletable ? message?.delete().catch(() => undefined) : null, 3e3);
}
/**
 * @description Отправляем сообщение, что музыка завершена
 * @param options {Queue_Options} Опции из очереди
 * @param message {ClientMessage} Сообщение с сервера
 */
async function SendChannelToEnd({stop}: Queue_Options, message: ClientMessage): Promise<void> {
    if (stop) return message.client.Send({text: `🎵 | Музыка была выключена`, message: message, type: 'css'});
    return message.client.Send({text: `🎵 | Музыка закончилась`, message: message, type: 'css'});
}
/**
 * @description Удаляем очередь
 * @param message {ClientMessage} Сообщение с сервера
 */
async function DeleteQueue(message: ClientMessage): Promise<NodeJS.Timeout> {
    return setTimeout(async () => {
        message.client.console(`[${message.guild.id}]: [Queue]: [Method: Delete]`);
        return message.client.queue.delete(message.guild.id);
    }, 1);
}