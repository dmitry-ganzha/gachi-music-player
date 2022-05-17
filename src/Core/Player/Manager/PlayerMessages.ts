import {ClientMessage} from "../../Client";
import {CurrentPlay} from "../Structures/Message/CurrentPlay";
import {Queue} from "../Structures/Queue/Queue";
import {Button} from "../Structures/Message/Helper";
import {Song} from "../Structures/Queue/Song";
import {Warning} from "../Structures/Message/Warning";
import {AddSong} from "../Structures/Message/AddSong";

const Message: ClientMessage[] = [];
let MessageTimer: NodeJS.Timeout = null;

/**
 * @description Отправляем сообщение о текущем треке, обновляем раз в 15 сек
 * @param message {ClientMessage} Сообщение
 * @constructor
 */
export function PlaySongMessage(message: ClientMessage) {
    if (Message.includes(message)) removeMessage(message);

    AddInQueueMessage(message).then((msg) => {
        addMessage(msg);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description При ошибке плеер выводит эту функцию
 * @param channel {ClientMessage<channel>} Канал
 * @param client {ClientMessage<client>} Клиент
 * @param guild {ClientMessage<guild>} Сервер
 * @param song {Song} Трек
 * @param err {Error | string} Ошибка
 * @constructor
 */
export function ErrorPlayerMessage({channel, client, guild}: ClientMessage, song: Song, err: Error | string = null) {
    try {
        const queue: Queue = client.queue.get(guild.id);
        const Embed = Warning(client, song, queue, err);
        const WarningChannelSend = channel.send({embeds: [Embed]});

        return DeleteMessage(WarningChannelSend, 5e3);
    } catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Сообщение о добавлении трека в очередь сервера
 * @param channel {ClientMessage<channel>} Канал
 * @param client {ClientMessage<client>} Клиент
 * @param guild {ClientMessage<guild>} Сервер
 * @param song {Song} Трек
 * @constructor
 */
export function PushSongMessage({channel, client, guild}: ClientMessage, song: Song) {
    setImmediate(() => {
        try {
            const queue: Queue = client.queue.get(guild.id);
            const EmbedPushedSong = AddSong(client, song, queue);
            const PushChannel = channel.send({embeds: [EmbedPushedSong]});

            return DeleteMessage(PushChannel, 5e3);
        } catch (e) {
            return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
        }
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщение
 * @param message {ClientMessage} Сообщение
 * @constructor
 */
function UpdateMessage(message: ClientMessage): void {
    const queue: Queue = message.client.queue.get(message.guild.id);

    if (!queue) return removeMessage(message);

    setImmediate(() => {
        const CurrentPlayEmbed = CurrentPlay(message.client, queue.songs[0], queue);

        try {
            return message.edit({embeds: [CurrentPlayEmbed]});
        } catch (e) {
            return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
        }
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем сообщение
 * @param message {ClientMessage} Сообщение
 * @constructor
 */
function AddInQueueMessage(message: ClientMessage): Promise<ClientMessage> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const CurrentPlayEmbed = CurrentPlay(message.client, queue.songs[0], queue);

    try {
        // @ts-ignore
        return message.channel.send({embeds: [CurrentPlayEmbed], components: [Button]});
    } catch (e) {
        console.log(`[${(new Date).toLocaleString("ru")}] [MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение со временем
 * @param send {ClientMessage} Сообщение
 * @param time {number} Время через сколько удаляем
 */
function DeleteMessage(send: Promise<ClientMessage>, time: number = 5e3): void {
    setImmediate(() => {
        send.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete() : null, time));
    });
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Добавляем сообщение в <Message[]>
 * @param message {message} Сообщение
 */
function addMessage(message: ClientMessage) {
    if (Message.includes(message)) return;
    Message.push(message);

    if (Message.length === 1) setImmediate(StepCycleMessage);
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение из <Message[]>, так-же проверяем отключить ли таймер
 * @param message
 */
function removeMessage(message: ClientMessage) {
    if (message.deletable) message.delete().catch(() => undefined);

    const index = Message.indexOf(message);
    if (index === -1) return;
    Message.splice(index, 1);

    if (Message.length === 0) {
        if (typeof MessageTimer !== 'undefined') clearTimeout(MessageTimer);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщения на текстовый каналах
 * @constructor
 */
function StepCycleMessage() {
    try {
        Message.forEach((message) => setImmediate(() => UpdateMessage(message)));
    } finally {
        MessageTimer = setTimeout(StepCycleMessage, 15e3);
    }
}