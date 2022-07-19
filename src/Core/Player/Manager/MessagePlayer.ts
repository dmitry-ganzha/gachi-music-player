import {ClientMessage} from "../../Client";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {CollectionMap} from "../../Utils/LiteUtils";
import {InputPlaylist} from "../../Utils/TypeHelper";
import {EmbedMessages} from "../Structures/EmbedMessages";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType} from "discord.js";

//Кнопки над сообщением о проигрывании трека
const Buttons = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId("last").setEmoji({id: "986009800867479572"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume_pause").setEmoji({id: "986009725432893590"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("skip").setEmoji({id: "986009774015520808"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("replay").setEmoji({id: "986009690716667964"}).setStyle(ButtonStyle.Secondary)]
);
//Кнопки с которыми можно взаимодействовать
const ButtonID = new Set(["skip", "resume_pause", "replay", "last"]);

//Баса с сообщениями
const Message = new CollectionMap<string, ClientMessage>();
let MessageTimer: NodeJS.Timeout = null; //Таймер

/**
 * Сообщения, которые отправляет плеер
 */
export namespace MessagePlayer {
    /**
     * @description Отправляем сообщение о текущем треке, обновляем раз в 15 сек
     * @param message {ClientMessage} Сообщение
     * @requires {removeMessage, addMessage, AddInQueueMessage, Message}
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
     * @requires {DeleteMessage}
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
     * @requires {DeleteMessage}
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
     * @requires {DeleteMessage}
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
 * @requires {removeMessage}
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
 * @requires {CreateCollector, Buttons}
 * @constructor
 */
function AddInQueueMessage(message: ClientMessage): Promise<ClientMessage> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const CurrentPlayEmbed = EmbedMessages.CurrentPlay(message.client, queue.songs[0], queue); // @ts-ignore
    const sendMessage = message.channel.send({embeds: [CurrentPlayEmbed], components: [Buttons]});

    sendMessage.then((msg) => CreateCollector(msg, queue));
    sendMessage.catch((e) => console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`));

    return sendMessage;
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем сборщик кнопок
 * @param message {ClientMessage} Сообщение
 * @param queue {Queue} Очередь сервера
 * @constructor
 */
function CreateCollector(message: ClientMessage, queue: Queue) {
    //Создаем сборщик кнопок
    const collector = message.createMessageComponentCollector({
        time: queue.songs[0].duration.seconds * 4, //Время через которое сборщик будет недоступен
        filter: (i) => ButtonID.has(i.customId), //Фильтруем
        componentType: ComponentType.Button, //Какие компоненты принимать
    });

    //Добавляем ему ивент сборки кнопок
    collector.on("collect", (i) => {
        switch (i.customId) {
            case "resume_pause": { //Если надо приостановить музыку или продолжить воспроизведение
                switch (queue?.player.state.status) {
                    case "playing": return queue?.player.pause();
                    case "paused": return queue?.player.resume();
                }
                return;
            }
            //Пропуск текущей музыки
            case "skip": return queue?.player.stop();
            //Повторно включить текущую музыку
            case "replay": return queue?.player.seek(message, 0);
            //Включить последнею из списка музыку
            case "last": return queue?.swapSongs();
        }
    });

    return collector;
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
 * @requires {StepCycleMessage}
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
 * @requires {MessageTimer, Message}
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
 * @requires {UpdateMessage, Message, MessageTimer}
 * @constructor
 */
function StepCycleMessage() {
    try {
        setImmediate(() => Message.forEach(UpdateMessage));
    } finally {
        MessageTimer = setTimeout(StepCycleMessage, 12e3);
    }
}