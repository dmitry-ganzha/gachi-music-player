import {TypedEmitter} from "tiny-typed-emitter";
import {Song} from "../../Manager/Queue/Structures/Song";
import {wMessage} from "../../../../../Core/Utils/TypesHelper";
import {VoiceManager} from "../../Manager/Voice/Voice";
import {Queue} from "../../Manager/Queue/Structures/Queue";

type EventsQueue = {
    DestroyQueue: (queue: Queue, message: wMessage, sendDelQueue?: boolean) => Promise<NodeJS.Timeout>,
    pushSong: (song: Song, message: wMessage) => Promise<number | null>
};
export type Queue_Channels = Queue["channels"];
export type Queue_Options = Queue["options"];

export class QueueEvents extends TypedEmitter<EventsQueue> {
    public constructor() {
        super();
        this.on('DestroyQueue', onDestroyQueue);
        this.on('pushSong', onPushSong);
        this.setMaxListeners(2);
    };
}
/**
 * @description Добавляем музыку в очередь
 * @param song {object}
 * @param message {object}
 */
async function onPushSong(song: Song, {client, guild}: wMessage): Promise<number | null> {
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
async function onDestroyQueue(queue: Queue, message: wMessage, sendDelQueue: boolean = true): Promise<NodeJS.Timeout> {
    if (!queue) return null;

    await DeleteMessage(queue.channels);
    await LeaveVoice(queue?.channels?.message?.guild.id);
    await DestroyEvents(queue);
    await CleanPlayer(queue);
    if (sendDelQueue) await SendChannelToEnd(queue.options, message);

    queue.songs = [];
    return DeleteQueue(message);
}
/**
 * @description Завершаем воспроизведение в player
 * @param queue {Queue}
 */
async function CleanPlayer(queue: Queue): Promise<void> {
    if (queue.player.state.resource) void queue.player.state.resource.playStream.emit('close');

    queue.player?.stop();
    return;
}
/**
 * @description Отключаемся от голосового канала
 * @param GuildID {string} ID сервера
 */
async function LeaveVoice(GuildID: string): Promise<void> {
    return new VoiceManager().Disconnect(GuildID);
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
 * @param message {wMessage} Сообщение с сервера
 */
async function SendChannelToEnd({stop}: Queue_Options, message: wMessage): Promise<void> {
    if (stop) return message.client.Send({text: `🎵 | Музыка была выключена`, message: message, type: 'css'});
    return message.client.Send({text: `🎵 | Музыка закончилась`, message: message, type: 'css'});
}
/**
 * @description Удаляем очередь
 * @param message {wMessage} Сообщение с сервера
 */
async function DeleteQueue(message: wMessage): Promise<NodeJS.Timeout> {
    return setTimeout(async () => {
        message.client.console(`[GuildQueue]: [Delete]: [${message.guild.id}]`);
        return message.client.queue.delete(message.guild.id);
    }, 1);
}
/**
 * @description Удаляем ивенты (не ждем пока Node.js сама со всем справится, память нужна всегда)
 * @param queue {Queue} Очередь
 */
async function DestroyEvents(queue: Queue): Promise<void> {
    //Destroy Message events
    queue.events.message = null;
    //Destroy Voice events
    queue.events.helper = null;
    //Destroy Queue events
    queue.events.queue = null;
}
