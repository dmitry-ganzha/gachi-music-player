import {ClientMessage} from "../../Client";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {CollectionMap} from "../../Utils/LiteUtils";
import {InputPlaylist} from "../../Utils/TypeHelper";
import {EmbedHelper, EmbedMessages} from "../Structures/EmbedMessages";

const Message = new CollectionMap<string, ClientMessage>();
let MessageTimer: NodeJS.Timeout = null;

/**
 * Сообщения, которые отправляет плеер
 */
export namespace MessagePlayer {
    /**
     * @description Отправляем сообщение о текущем треке, обновляем раз в 15 сек
     * @param message {ClientMessage} Сообщение
     * @constructor
     */
    export function PlaySong(message: ClientMessage) {
        if (Message.get(message.channelId)) removeMessage(message);

        AddInQueueMessage(message).then(addMessage);
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
    export function ErrorPlayer({channel, client, guild}: ClientMessage, song: Song, err: Error | string = null) {
        setImmediate(() => {
            try {
                const queue: Queue = client.queue.get(guild.id);
                const Embed = EmbedMessages.Warning(client, song, queue, err);
                const WarningChannelSend = channel.send({embeds: [Embed]});

                return DeleteMessage(WarningChannelSend, 5e3);
            } catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
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
    export function pushSong({channel, client, guild}: ClientMessage, song: Song) {
        setImmediate(() => {
            try {
                const queue: Queue = client.queue.get(guild.id);
                const EmbedPushedSong = EmbedMessages.pushSong(client, song, queue);
                const PushChannel = channel.send({embeds: [EmbedPushedSong]});

                return DeleteMessage(PushChannel, 8e3);
            } catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем сообщение о том что плейлист был добавлен в очередь
     * @param message {ClientMessage} Сообщение
     * @param playlist {InputPlaylist} Сам плейлист
     */
    export function pushPlaylist(message: ClientMessage, playlist: InputPlaylist) {
        const {channel, client} = message;

        setImmediate(() => {
            try {
                const EmbedPushPlaylist = EmbedMessages.pushPlaylist(message, playlist);
                const PushChannel = channel.send({embeds: [EmbedPushPlaylist]});

                return DeleteMessage(PushChannel, 8e3);
            } catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщение
 * @param message {ClientMessage} Сообщение
 * @constructor
 */
function UpdateMessage(message: ClientMessage): void {
    const queue: Queue = message.client.queue.get(message.guild.id);

    if (!queue || queue?.songs?.length === 0) return removeMessage(message);

    setImmediate(() => {
        const CurrentPlayEmbed = EmbedMessages.CurrentPlay(message.client, queue?.songs[0], queue);

        try {
            return message.edit({embeds: [CurrentPlayEmbed]});
        } catch (e) {
            message.client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
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
    const CurrentPlayEmbed = EmbedMessages.CurrentPlay(message.client, queue.songs[0], queue);

    try {
        // @ts-ignore
        return message.channel.send({embeds: [CurrentPlayEmbed], components: [EmbedHelper.Button]});
    } catch (e) {
        message.client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`);
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
    if (Message.get(message.channelId)) return;
    Message.set(message.channelId, message);

    if (Message.size === 1) setImmediate(StepCycleMessage);
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение из <Message[]>, так-же проверяем отключить ли таймер
 * @param message {ClientMessage} Сообщение
 */
function removeMessage(message: ClientMessage) {
    const Find = Message.get(message.channelId);
    if (!Find) return;

    if (Find.deletable) Find.delete().catch(() => undefined);
    Message.delete(message.channelId);

    if (Message.size === 0) {
        if (typeof MessageTimer !== "undefined") clearTimeout(MessageTimer);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщения на текстовый каналах
 * @constructor
 */
function StepCycleMessage() {
    try {
        setImmediate(() => Message.forEach(UpdateMessage));
    } finally {
        MessageTimer = setTimeout(StepCycleMessage, 12e3);
    }
}