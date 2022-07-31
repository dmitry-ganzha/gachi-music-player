import {ClientMessage} from "../../Client";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {LiteUtils} from "../../Utils/LiteUtils";
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
const MessagesData = {
    messages: new LiteUtils.CollectionMap<string, ClientMessage>(),
    timer: null as NodeJS.Timeout
}

/**
 * Сообщения, которые отправляет плеер
 */
export namespace MessagePlayer {
    /**
     * @description Отправляем сообщение о текущем треке, обновляем раз в 15 сек
     * @param message {ClientMessage} Сообщение
     * @requires {MessageUpdater, pushCurrentSongMessage, Message}
     * @constructor
     */
    export function toPlay(message: ClientMessage) {
        if (MessagesData.messages.get(message.channelId)) MessageUpdater.toRemove(message);

        pushCurrentSongMessage(message).then(MessageUpdater.toPush);
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
    export function toError({channel, client, guild}: ClientMessage, song: Song, err: Error | string = null) {
        setImmediate(() => {
            try {
                const queue: Queue = client.queue.get(guild.id);
                const Embed = EmbedMessages.toError(client, song, queue, err);
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
    export function toPushSong({channel, client, guild}: ClientMessage, song: Song) {
        setImmediate(() => {
            try {
                const queue: Queue = client.queue.get(guild.id);
                const EmbedPushedSong = EmbedMessages.toPushSong(client, song, queue);
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
    export function toPushPlaylist(message: ClientMessage, playlist: InputPlaylist) {
        const {channel, client} = message;

        setImmediate(() => {
            try {
                const EmbedPushPlaylist = EmbedMessages.toPushPlaylist(message, playlist);
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
 * @requires {MessageUpdater}
 * @constructor
 */
function UpdateMessage(message: ClientMessage): void {
    const queue: Queue = message.client.queue.get(message.guild.id);

    if (!queue || queue?.songs?.length === 0) return MessageUpdater.toRemove(message);

    setImmediate(() => {
        const CurrentPlayEmbed = EmbedMessages.toPlay(message.client, queue?.songs[0], queue);

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
function pushCurrentSongMessage(message: ClientMessage): Promise<ClientMessage> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const CurrentPlayEmbed = EmbedMessages.toPlay(message.client, queue.songs[0], queue); // @ts-ignore
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
            case "replay": return queue?.player.play(message);
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
 * Система для обновления данных сообщения
 */
namespace MessageUpdater {
    /**
     * @description Добавляем сообщение в <Message[]>
     * @param message {message} Сообщение
     * @requires {StepCycleMessage}
     */
    export function toPush(message: ClientMessage) {
        if (MessagesData.messages.get(message.channelId)) return;
        MessagesData.messages.set(message.channelId, message);

        if (MessagesData.messages.size === 1) setImmediate(StepCycleMessage);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем сообщение из <Message[]>, так-же проверяем отключить ли таймер
     * @param message {ClientMessage} Сообщение
     * @requires {Message}
     */
    export function toRemove(message: ClientMessage) {
        const Find = MessagesData.messages.get(message.channelId);
        if (!Find) return;

        if (Find.deletable) Find.delete().catch(() => undefined);
        MessagesData.messages.delete(message.channelId);

        if (MessagesData.messages.size === 0) {
            if (typeof MessagesData.timer !== "undefined") clearTimeout(MessagesData.timer);
        }
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщения на текстовый каналах
 * @requires {UpdateMessage, Message}
 * @constructor
 */
function StepCycleMessage() {
    try {
        setImmediate(() => MessagesData.messages.forEach(UpdateMessage));
    } finally {
        MessagesData.timer = setTimeout(StepCycleMessage, 12e3);
    }
}