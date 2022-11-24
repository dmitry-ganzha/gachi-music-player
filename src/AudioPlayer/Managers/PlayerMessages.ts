import {Queue} from "../Structures/Queue/Queue";
import {InputPlaylist, Song} from "../Structures/Queue/Song";
import {EmbedMessages} from "../Structures/EmbedMessages";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ComponentType} from "discord.js";
import {ClientMessage} from "../../Handler/Events/Activity/interactiveCreate";
import {messageUtils} from "../../Structures/Handle/Command";
import {consoleTime} from "../../Core/Client/Client";

//Кнопки над сообщением о проигрывании трека
const Buttons = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId("last").setEmoji({id: "986009800867479572"}).setStyle(ButtonStyle.Secondary), //id: "986009800867479572" или name: "⏪"
    new ButtonBuilder().setCustomId("resume_pause").setEmoji({id: "986009725432893590"}).setStyle(ButtonStyle.Secondary), //id: "986009725432893590" или name: "⏯"
    new ButtonBuilder().setCustomId("skip").setEmoji({id: "986009774015520808"}).setStyle(ButtonStyle.Secondary), //id: "986009774015520808" или name: "⏩"
    new ButtonBuilder().setCustomId("replay").setEmoji({id: "986009690716667964"}).setStyle(ButtonStyle.Secondary)] //id: "986009690716667964" или name: "🔃"
);
//Кнопки с которыми можно взаимодействовать
const ButtonID = new Set(["skip", "resume_pause", "replay", "last"]);
//Статусы плеера при которых не надо обновлять сообщение
const PlayerStatuses = new Set(["idle", "paused", "autoPaused"]);

//База с сообщениями
const MessagesData = {
    messages: new Collection<string, ClientMessage>(), //new Map сообщений, поиск осуществляется по id канала
    timer: null as NodeJS.Timeout //Общий таймер сообщений
}

//Сообщения, которые отправляет плеер
export namespace MessagePlayer {
    /**
     * @description Отправляем сообщение о текущем треке, обновляем раз в 15 сек
     * @param message {ClientMessage} Сообщение
     * @requires {MessageUpdater, pushCurrentSongMessage, Message}
     */
    export function toPlay(message: ClientMessage) {
        //Если уже есть сообщение то удаляем
        if (MessagesData.messages.get(message.channelId)) MessageUpdater.toRemove(message);

        setImmediate(() => {
            const msg = pushCurrentSongMessage(message);

            if (msg) msg.then(MessageUpdater.toPush).catch((err) => console.log(err));
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description При ошибке плеер выводит эту функцию
     * @param queue {Queue} Очередь
     * @param err {Error | string} Ошибка
     */
    export function toError(queue: Queue, err: Error | string = null) {
        const {client, channel} = queue.message;

        setImmediate(() => {
            try {
                const Embed = EmbedMessages.toError(client, queue, err);
                const WarningChannelSend = channel.send({embeds: [Embed]});

                WarningChannelSend.then(messageUtils.deleteMessage);
            } catch (e) {
                consoleTime(`[MessagePlayer]: [function: toError]: ${e.message}`);
            }
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Сообщение о добавлении трека в очередь сервера
     * @param queue {Queue} Очередь
     * @param song {Song} Трек
     */
    export function toPushSong(queue: Queue, song: Song) {
        const {client, channel} = queue.message;

        setImmediate(() => {
            try {
                const EmbedPushedSong = EmbedMessages.toPushSong(client, song, queue);
                const PushChannel = channel.send({embeds: [EmbedPushedSong]});

                PushChannel.then(messageUtils.deleteMessage);
            } catch (e) {
                consoleTime(`[MessagePlayer]: [function: toPushSong]: ${e.message}`);
            }
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем сообщение о том что плейлист был добавлен в очередь
     * @param message {ClientMessage} Сообщение
     * @param playlist {InputPlaylist} Сам плейлист
     */
    export function toPushPlaylist(message: ClientMessage, playlist: InputPlaylist) {
        const {channel} = message;

        setImmediate(() => {
            try {
                const EmbedPushPlaylist = EmbedMessages.toPushPlaylist(message, playlist);
                const PushChannel = channel.send({embeds: [EmbedPushPlaylist]});

                PushChannel.then(messageUtils.deleteMessage);
            } catch (e) {
                consoleTime(`[MessagePlayer]: [function: toPushPlaylist]: ${e.message}`);
            }
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщение
 * @param message {ClientMessage} Сообщение
 * @requires {MessageUpdater}
 */
function UpdateMessage(message: ClientMessage): void {
    const queue: Queue = message.client.queue.get(message.guild.id);

    //Если очереди нет, то удаляем сообщение
    if (!queue || !queue?.song) return MessageUpdater.toRemove(message);

    //Если у плеера статус при котором нельзя обновлять сообщение
    if (PlayerStatuses.has(queue.player.state.status)) return;

    setImmediate(() => {
        const CurrentPlayEmbed = EmbedMessages.toPlay(message.client, queue);

        //Обновляем сообщение
        return message.edit({embeds: [CurrentPlayEmbed]}).catch((e) => consoleTime(`[MessageEmitter]: [function: UpdateMessage]: ${e.message}`));
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем сообщение
 * @param message {ClientMessage} Сообщение
 * @requires {CreateCollector, Buttons}
 */
function pushCurrentSongMessage(message: ClientMessage): Promise<ClientMessage> {
    const queue: Queue = message.client.queue.get(message.guild.id);

    if (!queue?.song) return;

    const CurrentPlayEmbed = EmbedMessages.toPlay(message.client, queue);
    const sendMessage = message.channel.send({embeds: [CurrentPlayEmbed as any], components: [Buttons as any]});

    sendMessage.then((msg) => CreateCollector(msg, queue)); //Добавляем к сообщению кнопки
    sendMessage.catch((e) => console.log(`[MessageEmitter]: [function: pushCurrentSongMessage]: ${e.message}`));

    return sendMessage;
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем сборщик кнопок
 * @param message {ClientMessage} Сообщение
 * @param queue {Queue} Очередь сервера
 */
function CreateCollector(message: ClientMessage, queue: Queue) {
    //Создаем сборщик кнопок
    const collector = message.createMessageComponentCollector({
        filter: (i) => ButtonID.has(i.customId), //Фильтруем
        componentType: ComponentType.Button //Какие компоненты принимать
    });

    //Добавляем ему ивент сборки кнопок
    collector.on("collect", (i) => {
        switch (i.customId) {
            case "resume_pause": { //Если надо приостановить музыку или продолжить воспроизведение
                switch (queue?.player.state.status) {
                    case "read": return message.client.commands.get("pause").run(i as any);
                    case "pause": return message.client.commands.get("resume").run(i as any);
                }
                return;
            }
            //Пропуск текущей музыки
            case "skip": return message.client.commands.get("skip").run(i as any);
            //Повторно включить текущую музыку
            case "replay": return message.client.commands.get("replay").run(i as any);
            //Включить последнею из списка музыку
            case "last": return queue?.swapSongs();
        }
    });

    return collector;
}

//Система для обновления данных сообщения
namespace MessageUpdater {
    /**
     * @description Добавляем сообщение в <Message[]>
     * @param message {message} Сообщение
     * @requires {StepCycleMessage}
     */
    export function toPush(message: ClientMessage) {
        if (MessagesData.messages.get(message.channelId)) return; //Если сообщение уже есть в базе, то ничего не делаем
        MessagesData.messages.set(message.channelId, message); //Добавляем сообщение в базу

        //Если в базе есть хоть одно сообщение, то запускаем таймер
        if (MessagesData.messages.size === 1) setImmediate(StepCycleMessage);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем сообщение из <Message[]>, так-же проверяем отключить ли таймер
     * @param message {ClientMessage} Сообщение
     * @requires {Message}
     */
    export function toRemove(message: ClientMessage) {
        const Find = MessagesData.messages.get(message.channelId); //Ищем сообщение е базе
        if (!Find) return; //Если его нет ничего не делаем

        if (Find.deletable) Find.delete().catch(() => undefined); //Если его возможно удалить, удаляем!
        MessagesData.messages.delete(message.channelId); //Удаляем сообщение из базы

        //Если в базе больше нет сообщений
        if (MessagesData.messages.size === 0) {
            //Если таймер еще работает то удаляем его
            if (typeof MessagesData.timer !== "undefined") clearTimeout(MessagesData.timer);
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Обновляем сообщения на текстовый каналах
     */
    function StepCycleMessage() {
        try {
            setImmediate(() => MessagesData.messages.forEach(UpdateMessage));
        } finally {
            MessagesData.timer = setTimeout(StepCycleMessage, 15e3);
        }
    }
}