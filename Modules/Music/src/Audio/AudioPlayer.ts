import {addAudioPlayer, deleteAudioPlayer, FFmpegStream, FindResource} from "./Helper";
import {wMessage} from "../../../../Core/Utils/TypesHelper";
import {Queue} from "../Manager/Queue/Structures/Queue";
import {Song} from "../Manager/Queue/Structures/Song";
import {WarningMessage} from "../Events/Message/MessageEmitter";
import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {TypedEmitter} from "tiny-typed-emitter";

//Статусы плеера для пропуска музыки
export const StatusPlayerHasSkipped: Set<string> = new Set(['playing', 'paused', 'buffering', 'autopaused']);
const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

interface PlayerStateIdle {
    status: "idle",
    resource?: FFmpegStream
}
interface PlayerStatePlaying {
    status: "playing";
    resource: FFmpegStream;

    onStreamError: (error: any) => void;
}
interface PlayerStatePaused {
    status: "paused" | "autoPaused";
    resource: FFmpegStream;

    onStreamError: (error: any) => void;
}
interface PlayerStateBuffering {
    status: "buffering";
    resource: FFmpegStream;

    onReadableCallback: () => void;
    onFailureCallback: () => void;
    onStreamError: (error: any) => void;
}

type PlayerState = PlayerStateBuffering | PlayerStateIdle | PlayerStatePaused | PlayerStatePlaying;

type PlayerEvents = {
    error: (error: any) => Awaited<void>;
    subscribe: (subscription: PlayerSubscription) => Awaited<void>;
    unsubscribe: (subscription: PlayerSubscription) => Awaited<void>;

    idle: (oldState: PlayerState, newState: PlayerState) => Awaited<void>;
    paused: (oldState: PlayerState, newState: PlayerState) => Awaited<void>;
    buffering: (oldState: PlayerState, newState: PlayerState) => Awaited<void>;
    autoPaused: (oldState: PlayerState, newState: PlayerState) => Awaited<void>;
    playing: (oldState: PlayerState, newState: PlayerState) => Awaited<void>;
}

export class AudioPlayer extends TypedEmitter<PlayerEvents> {
    protected _state: PlayerState = { status: "idle" };
    protected subscribers: PlayerSubscription[] = [];

    /**
     * @description Проверка играет ли сейчас плеер
     */
    public get checkPlayable() {
        if (this.state.status === "idle" || this.state.status === "buffering") return false;

        //Если невозможно прочитать поток выдать false
        if (!this.state.resource.readable) {
            this.state = { status: "idle" };
            return false;
        }
        return true;
    };

    /**
     * @description В каких голосовых каналах играет бот
     * @constructor
     */
    public get PlayableVoiceChannels() { return this.subscribers.filter(({ connection }) => connection.state.status === "ready").map(({ connection }) => connection); };

    /**
     * @description С помощью этого можно полностью перенастроить плеер! *Лучше не трогать, если не знаешь что делать*. Параметр set has protected
     */
    public get state() { return this._state; };

    /**
     * @description С помощью этого можно полностью перенастроить плеер! *Лучше не трогать, если не знаешь что делать*. Параметр set has protected
     */
    protected set state(newState: PlayerState) {
        const OldState = this._state; //Старая статистика плеера
        const newResource = newState?.resource; //Новый поток. Есть ли он?

        if (OldState.status !== "idle" && OldState.resource !== newResource) setImmediate(() => OldState.resource.destroy().catch(() => undefined));

        //Удаляем плеер если статус "idle"
        if (newState.status === "idle") {
            this._signalStopSpeaking();
            deleteAudioPlayer(this);
        }
        if (newResource) addAudioPlayer(this);

        const isNewResources = OldState.status !== "idle" && newState.status === "playing" && OldState.resource !== newState.resource;
        this._state = newState; //Обновляем статистику плеера

        if (OldState.status !== newState.status || isNewResources) {
            //Перед сменой статуса плеера отправляем пустой пакет. Необходим для исправления кривизны потока!
            this._playPacket(SILENCE_FRAME, this.PlayableVoiceChannels);
            this.emit(newState.status, OldState, this._state as any);
        }
    };

    /**
     * @description Что будет отправлять в голосовой канал
     * @param resource {FFmpegStream} Поток
     */
    public play = (resource: FFmpegStream): void | any => {
        const onStreamError = (error: Error) => {
            if (this.state.status !== "idle") void this.emit('error', error);
            if (this.state.status !== "idle" && this.state.resource === resource) this.state = { status: "idle" };
        };

        if (resource.started) this.state = { status: "playing", resource, onStreamError };
        else {
            const onReadableCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource)
                    this.state = { status: "playing", resource, onStreamError };
            };
            const onFailureCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "idle" };
            };

            resource.playStream.once('readable', onReadableCallback);
            void ['end', 'close', 'finish'].map((event: string) => resource.playStream.once(event, onFailureCallback));
            this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
        }
        return;
    };

    /**
     * @description Приостанавливаем отправку пакетов в голосовой канал
     */
    public pause = () => {
        if (this.state.status !== "playing") return false;
        this.state = { ...this.state, status: "paused" };
        return true;
    };

    /**
     * @description Продолжаем отправлять пакеты в голосовой канал
     */
    public unpause = () => {
        if (this.state.status !== "paused") return false;
        this.state = { ...this.state, status: "playing" };
        return true;
    };

    /**
     * @description Пропускаем текущий трек
     * @param force {boolean}
     */
    public stop = (force: boolean = false) => {
        if (this.state.status === "idle") return false;
        if (force || this.state.resource.silencePaddingFrames === 0) this.state = { status: "idle" };
        else if (this.state.resource.silenceRemaining === -1) this.state.resource.silenceRemaining = this.state.resource.silencePaddingFrames;
        return true;
    };


    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    private subscribe = (connection: VoiceConnection) => {
        const existingSubscription = this.subscribers.find((subscription) => subscription.connection === connection);
        if (!existingSubscription) {
            const subscription = new PlayerSubscription(connection, this as any);
            this.subscribers.push(subscription);
            setImmediate(() => this.emit('subscribe', subscription));
            return subscription;
        }
        return existingSubscription;
    };
    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param subscription {PlayerSubscription} Голосовой канал на котором больше не будет играть музыка
     */
    private unsubscribe = (subscription: PlayerSubscription) => {
        const index = this.subscribers.indexOf(subscription);
        const exists = index !== -1;
        if (exists) {
            this.subscribers.splice(index, 1);
            subscription.connection.setSpeaking(false);
            this.emit('unsubscribe', subscription);
        }
        return exists;
    };

    /**
     * @description Проверка перед отправкой пакета в голосовой канал
     */
    private _sendPacket = () => {
        //Если статус (idle или buffering) прекратить выполнение функции
        if (this.state.status === "idle" || this.state.status === "buffering") return;

        //Голосовые каналы к которым подключен плеер
        const Receivers = this.PlayableVoiceChannels;

        //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
        if (this.state.status === "autoPaused" && Receivers.length > 0) this.state = { ...this.state, status: "playing" };

        //Не читать пакеты при статусе плеера (paused | autoPaused)
        if (this.state.status === "paused" || this.state.status === "autoPaused") return;

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (Receivers.length === 0) {
            this.state = {...this.state, status: "autoPaused"};
            return;
        }

        //Отправка музыкального пакета
        if (this.state.status === "playing") {
            const packet: Buffer | null = this.state.resource.read();

            if (packet) this._playPacket(packet, Receivers);
            else {
                this._signalStopSpeaking();
                this.stop();
            }
        }
    };

    //Перестаем передавать пакеты во все доступные каналы
    protected _signalStopSpeaking = () => this.subscribers.forEach(({ connection }) => connection.setSpeaking(false));
    //Отправляем пакет во все доступные каналы
    protected _playPacket = (packet: Buffer, receivers: VoiceConnection[]) => receivers.forEach((connection) => connection.playOpusPacket(packet));

    public destroy = () => {
        if (this.subscribers) delete this.subscribers;
        if (this._state) delete this._state;

        this.removeAllListeners();
    };
}

/**
 * @description Настраиваем AudioPlayer
 */
export class RunPlayer extends AudioPlayer {
    public set playingTime(time: number) { this.state.resource.playbackDuration = time; };

    public constructor(msg: wMessage) {
        super();
        try {
            this.on("idle", async () => onIdlePlayer(msg));
            this.on("buffering", async () => onBufferingPlayer(msg));
            this.on("autoPaused", async () => onAutoPausePlayer(msg));
        } catch (e) {
            this.emit("error", e);
        }

        this.on("error", async (err: any) => onErrorPlayer(err, msg));
        this.setMaxListeners(4);
    };
    /**
     * @description Включаем музыку с пропуском
     * @param message {wMessage} Сообщение с сервера
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    public seek = async (message: wMessage, seek: number = 0): Promise<void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        let stream: FFmpegStream;

        try {
            stream = await CreateResource(message, seek);
        } finally {
            CheckReadableStream(queue, stream, seek);
        }
    };

    /**
     * @description Включаем музыку
     * @param message {wMessage} Сообщение с сервера
     */
    public static playStream = async (message: wMessage): Promise<boolean | void> => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);
        let stream: FFmpegStream;

        if (queue.songs?.length === 0) return void queue.events.queue.emit('DestroyQueue', queue, message);

        try {
            stream = await CreateResource(message); //(await Promise.all([CreateResource(message)]))[0];
        } finally {
            client.console(`[${guild.id}]: [${queue.songs[0].type}]: [${queue.songs[0].title}]`);
            CheckReadableStream(queue, stream, 0, true);
        }
    };
}

/**
 * @description Авто проверка на работоспособность аудио
 * @param queue {Queue} Очередь сервера
 * @param stream {FFmpegStream} Аудио
 * @param seek {number} Пропуск музыки до 00:00:00
 * @param sendMessage {boolean} Отправить сообщение о текущей музыке
 */
function CheckReadableStream(queue: Queue, stream: FFmpegStream, seek: number = 0, sendMessage: boolean = false): NodeJS.Timeout | void | boolean {
    if (!stream) return void queue.player.emit('error', 'Error: AudioResource has not found' as any);
    if (stream?.ended) return void queue.player.emit('error', `[AudioPlayer]: [Message: Fail to load a ended stream]` as any);
    if (!stream?.readable) return setTimeout(() => CheckReadableStream, 50);

    let QueueFunctions = [queue.player.play(stream)];

    if (sendMessage) QueueFunctions.push(queue.events.message.PlaySongMessage(queue.channels.message));
    Promise.all(QueueFunctions).catch((err: Error) => new Error(`[AudioPlayer]: [Message: Fail to promise.all] [Reason]: ${err}`));

    if (seek) queue.player.playingTime = seek * 1000;
}

/**
 * @description Создаем Opus поток
 * @param message {wMessage} Сообщение с сервера
 * @param seek {number} Пропуск музыки до 00:00:00
 */
async function CreateResource(message: wMessage, seek: number = 0): Promise<FFmpegStream> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const song = queue.songs[0];

    if (!song.format?.url) await Promise.all([FindResource(song)]);

    if (song.isLive) return new FFmpegStream(song.format.url, null);
    return new FFmpegStream(song.format.url, {...queue.audioFilters, seek});
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//                                       Player events
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Когда плеер завершит песню, он возвратит эту функцию
 * @param message {wMessage} Сообщение с сервера
 */
async function onIdlePlayer(message: wMessage): Promise<NodeJS.Timeout | null | boolean | void> {
    const {client, guild} = message;
    const queue: Queue = client.queue.get(guild.id);

    if (!queue || queue?.songs?.length <= 0) return null;

    setTimeout(() => {
        isRemoveSong(queue);
        if (queue.options.random) return Shuffle(message, queue);
        return RunPlayer.playStream(message);
    }, 750);
}

/**
 * @description Когда плеер выдает ошибку, он возвратит эту функцию
 * @param err {any} Ошибка
 * @param message {wMessage} Сообщение с сервера
 */
async function onErrorPlayer(err: any, message: wMessage): Promise<void> {
    const queue: Queue = message.client.queue.get(message.guild.id);

    await WarningMessage(message, queue.songs[0], err);

    if (queue.songs.length === 1) queue.events.queue.emit("DestroyQueue", queue, message);
    if (queue.songs) queue.player.stop();

    return;
}

/**
 * @description Когда плеер получает поток (музыку), он возвратит эту функцию
 * @param message {wMessage} Сообщение с сервера
 */
async function onBufferingPlayer(message: wMessage): Promise<NodeJS.Timeout | null> {
    const {client, guild} = message;

    return setTimeout(async () => {
        const queue: Queue = client.queue.get(guild.id);
        const song: Song = queue?.songs[0];

        if (!queue) return;
        if (queue.player.state.status === 'buffering' && !queue.player.state?.resource?.started && !song.format?.work) {
            console.log(`[Fail load] -> `, song.format?.url);
            await client.Send({text: `${song.requester}, не удалось включить эту песню! Пропуск!`, message: queue.channels.message});
            queue.player.stop();
            return;
        }
    }, 15e3);
}

/**
 * @description Если плеер сам ставит на паузу
 * @param message {wMessage} Сообщение с сервера
 */
async function onAutoPausePlayer(message: wMessage) {
    const {channels, player}: Queue = message.client.queue.get(message.guild.id);

    //Проверяем если канал на который надо выводить музыку
    if (!channels.connection?.subscribe) channels.connection.subscribe = player;
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Повтор музыки
 * @param queue {Queue} Очередь сервера
 */
function isRemoveSong({options, songs}: Queue): null {
    if (options.loop === "song") return null;
    else if (options.loop === "songs") {
        const repeat = songs.shift();
        songs.push(repeat);
    } else songs.shift();

    return null;
}

/**
 * @description Перетасовка музыки в очереди
 * @param message {wMessage} Сообщение с сервера
 * @param queue {Queue} Очередь сервера
 */
function Shuffle(message: wMessage, {songs}: Queue): Promise<boolean | void> {
    const set: number = Math.floor(Math.random() * songs.length);
    const LocalQueue2: Song = songs[set];

    songs[set] = songs[0];
    songs[0] = LocalQueue2;

    return RunPlayer.playStream(message);
}