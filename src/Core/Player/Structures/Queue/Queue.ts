import {StageChannel, VoiceChannel} from "discord.js";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {Song} from "./Song";
import {ClientMessage} from "../../../Client";
import {VoiceConnection} from "@discordjs/voice";
import {TypedEmitter} from "tiny-typed-emitter";
import {MessagePlayer} from "../../Manager/MessagePlayer";

export type LoopType = "song" | "songs" | "off";
export type AudioFilters = Array<string> | Array<string | number>;

export class Queue {
    readonly #_player: AudioPlayer;
    readonly #_emitter: QueueEvent = new QueueEvent();
    readonly #_channels: { message: ClientMessage, voice: VoiceChannel | StageChannel, connection: VoiceConnection };
    readonly #_options: { random: boolean, loop: LoopType, stop: boolean } = {
        random: false,
        loop: "off",
        stop: false,
    };
    public audioFilters: Array<string> | Array<string | number> = [];
    public songs: Array<Song> = [];

    //Создаем очередь
    public constructor(message: ClientMessage, voice: VoiceChannel) {
        this.#_player = new AudioPlayer();
        this.#_channels = { message, voice, connection: null};

        this.player.on("idle", () => onIdlePlayer(message));
        this.player.on("error", (err: any) => onErrorPlayer(err, message));
    };

    /**
     * @description Меняет местами треки
     * @param customNum {number} Если есть номер для замены
     */
    public readonly swapSongs = (customNum?: number) => {
        if (this.songs.length === 1) return this.player.stop();

        const SetNum = customNum ? customNum : this.songs.length - 1;
        const ArraySongs: Array<Song> = this.songs;
        const hasChange = ArraySongs[SetNum];

        ArraySongs[SetNum] = ArraySongs[0];
        ArraySongs[0] = hasChange;
        this.player.stop();
        return;
    };

    //Данные плеера
    public get player() {
        return this.#_player;
    };
    //Данные emitter
    public get emitter() {
        return this.#_emitter;
    };
    //Все каналы
    public get channels() {
        return this.#_channels;
    };
    //Настройки
    public get options() {
        return this.#_options;
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Когда плеер завершит песню, он возвратит эту функцию
 * @param message {ClientMessage} Сообщение с сервера
 * @requires {isRemoveSong}
 * @private
 */
function onIdlePlayer(message: ClientMessage): void {
    const {client, guild} = message;
    const queue: Queue = client.queue.get(guild.id);

    setTimeout(() => {
        if (queue?.songs) isRemoveSong(queue); //Определяем тип loop

        //Рандомим номер трека, просто меняем их местами
        if (queue?.options?.random) {
            const RandomNumSong = Math.floor(Math.random() * queue.songs.length)
            queue.swapSongs(RandomNumSong);
        }

        return queue.player.play(message); //Включаем трек
    }, 500);
}
//====================== ====================== ====================== ======================
/**
 * @description Когда плеер выдает ошибку, он возвратит эту функцию
 * @param err {Error | string} Ошибка
 * @param message {ClientMessage} Сообщение с сервера
 * @private
 */
function onErrorPlayer(err: Error | string, message: ClientMessage): void {
    const queue: Queue = message.client.queue.get(message.guild.id);

    //Выводим сообщение об ошибке
    MessagePlayer.ErrorPlayer(message, queue.songs[0], err);

    queue.songs.shift();
    setTimeout(() => queue.player.play(message), 1e3);
}
//====================== ====================== ====================== ======================
/**
 * @description Повтор музыки
 * @param queue {Queue} Очередь сервера
 */
function isRemoveSong({options, songs}: Queue): void {
    switch (options?.loop) {
        case "song": return;
        case "songs": return void songs.push(songs.shift());
        default: return void songs.shift();
    }
}
//====================== ====================== ====================== ======================
//Доступные ивенты QueueEvent
interface QueueEvents {
    DeleteQueue: (message: ClientMessage, sendDelQueue?: boolean) => void;
    StartDelete: (queue: Queue) => void;
    CancelDelete: (player: AudioPlayer) => void;
}
/**
 * @description Нужно только для того что-бы удалить очередь один раз)
 */
class QueueEvent extends TypedEmitter<QueueEvents> {
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