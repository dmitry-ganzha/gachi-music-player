import {FindResource} from "./Helper";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {WarningMessage} from "../Manager/Message";
import {TypedEmitter} from "tiny-typed-emitter";
import {ClientMessage} from "../../Client";
import {AudioFilters} from "../FFmpeg";
import {FFmpegStream} from "../FFmpeg/FFmpegStream";
import {addAudioPlayer, deleteAudioPlayer} from "../Manager/DataStore";
import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";

//Статусы плеера для пропуска музыки
export const StatusPlayerHasSkipped: Set<string> = new Set(['playing', 'paused', 'buffering', 'autoPaused']);
const EmptyFrame = Buffer.from([0xf8, 0xff, 0xfe]);

/**
 * @description Плеер!)
 */
export class AudioPlayer extends TypedEmitter<PlayerEvents> {
    protected _state: PlayerState = { status: "idle" };
    protected subscribers: PlayerSubscription[] = [];
    //====================== ====================== ====================== ======================
    /**
     * @description Текущее время плеера в мс
     */
    public get CurrentTime() {
        if (this.state.resource?.playbackDuration <= 0) return 0;
        return parseInt((this.state.resource?.playbackDuration / 1000).toFixed(0));
    };
    protected set CurrentTime(time: number) {
        this.state.resource.playbackDuration = time * 1e3;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Голосовые каналы в которых можно включить музыку
     */
    protected get VoiceChannels() {
        return this.subscribers.filter(( {connection} ) => connection.state.status === "ready").map(({connection}) => connection);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверка играет ли сейчас плеер
     */
    public get checkPlayable(): boolean {
        if (this.state.status === "idle" || this.state.status === "buffering") return false;

        //Если невозможно прочитать поток выдать false
        if (!this.state.resource.readable) {
            this.state = { status: "idle" };
            return false;
        }
        return true;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description С помощью этого можно полностью перенастроить плеер! *Лучше не трогать, если не знаешь что делать*. Параметр set has protected
     */
    public get state() { return this._state; };
    protected set state(newState: PlayerState) {
        const OldState = this._state; //Старая статистика плеера
        const newResource = newState?.resource; //Новый поток. Есть ли он?

        if (OldState.status !== "idle" && OldState.resource !== newResource) setImmediate(() => OldState.resource.destroy());

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
            this._playPacket(EmptyFrame, this.VoiceChannels);

            if (isNewResources) void this.emit(newState.status, OldState, this._state);
            else void this.emit(newState.status, OldState, this._state);
        }
    };
    //====================== ====================== ====================== ======================
    public constructor(msg: ClientMessage) {
        super();
        this.on("idle", () => this.onIdlePlayer(msg));
        this.on("error", (err: any) => this.onErrorPlayer(err, msg));
        this.setMaxListeners(2);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Включаем музыку с пропуском
     * @param message {ClientMessage} Сообщение с сервера
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    public seek = (message: ClientMessage, seek: number = 0): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        setImmediate(() =>
            CreateResource(queue.songs[0], queue.audioFilters, seek).then((stream: FFmpegStream) => {
                this.play(stream);
                if (seek) this.CurrentTime = seek;
            })
        );
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Включаем музыку
     * @param message {ClientMessage} Сообщение с сервера
     */
    public playStream = (message: ClientMessage): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        if (queue.songs?.length === 0) return void queue.events.queue.emit('DestroyQueue', queue, message);

        setImmediate(() =>
            CreateResource(queue.songs[0], queue.audioFilters).then((stream: FFmpegStream) => {
                client.console(`[${guild.id}]: [${queue.songs[0].type}]: [${queue.songs[0].title}]`);
                queue.events.message.PlaySongMessage(queue.channels.message);
                this.play(stream);
            })
        );
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Приостанавливаем отправку пакетов в голосовой канал
     */
    public pause = (): boolean => {
        if (this.state.status !== "playing") return;
        this.state = { ...this.state, status: "paused" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Продолжаем отправлять пакеты в голосовой канал
     */
    public resume = (): boolean => {
        if (this.state.status !== "paused") return;
        this.state = { ...this.state, status: "playing" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Пропускаем текущий трек
     * @param force {boolean}
     */
    public stop = (force: boolean = false): boolean => {
        if (this.state.status === "idle") return;
        if (force || this.state.resource.silencePaddingFrames === 0) this.state = { status: "idle" };
        else if (this.state.resource.silenceRemaining === -1) this.state.resource.silenceRemaining = this.state.resource.silencePaddingFrames;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Что будет отправлять в голосовой канал
     * @param resource {FFmpegStream} Поток
     */
    protected play = (resource: FFmpegStream): void => {
        if (!resource) return void this.emit('error', 'Error: AudioResource has not found');
        if (resource?.ended) return void this.emit('error', `[AudioPlayer]: [Message: Fail to load a ended stream]`);
        if (!resource?.readable) return void setTimeout(this.play, 25);

        const onStreamError = (error: Error) => {
            if (this.state.status !== "idle") void this.emit('error', error);
            if (this.state.status !== "idle" && this.state.resource === resource) this.state = { status: "idle" };
        };

        if (resource.started) this.state = { status: "playing", resource, onStreamError };
        else {
            const onReadableCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "playing", resource, onStreamError };
            };
            const onFailureCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "idle" };
            };

            resource.playStream.once('readable', onReadableCallback);
            ['end', 'close', 'finish'].map((event: string) => resource.playStream.once(event, onFailureCallback));
            this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
        }
    };
    //====================== ====================== ====================== ======================

    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    protected subscribe = (connection: VoiceConnection) => {
        const FindVoiceChannel = this.subscribers.find((sub) => sub.connection === connection);

        if (!FindVoiceChannel) {
            const PlayerSub = new PlayerSubscription(connection, this as any);
            this.subscribers.push(PlayerSub);
            //return PlayerSub;
        }
       //return FindVoiceChannel;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param subscription {PlayerSubscription} Голосовой канал на котором больше не будет играть музыка
     */
    protected unsubscribe = (subscription: PlayerSubscription) => {
        const index = this.subscribers.indexOf(subscription);
        const FindInIndex = index !== -1;

        if (FindInIndex) {
            this.subscribers.splice(index, 1);
            subscription.connection.setSpeaking(false);
        }

        //return FindInIndex;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверка перед отправкой пакета в голосовой канал
     */
    protected _sendPacket = (): void => {
        //Если статус (idle или buffering) прекратить выполнение функции
        if (this.state.status === "idle" || this.state.status === "buffering" || this.state.status === "paused") return;

        //Голосовые каналы к которым подключен плеер
        const Receivers = this.VoiceChannels;

        //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
        if (this.state.status === "autoPaused" && Receivers.length > 0) this.state = { ...this.state, status: "playing" };

        //Не читать пакеты при статусе плеера (paused | autoPaused)
        if (this.state.status === "autoPaused") return;

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (Receivers.length === 0) return void (this.state = { ...this.state, status: "autoPaused" });

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
    //====================== ====================== ====================== ======================
    /**
     * @description Перестаем передавать пакеты во все доступные каналы
     */
    protected _signalStopSpeaking = () => this.subscribers.forEach(({connection} ) => connection.setSpeaking(false));
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем пакет во все доступные каналы
     * @param packet {Buffer} Сам пакет
     * @param receivers {VoiceConnection[]} В какие каналы отправить пакет
     */
    protected _playPacket = (packet: Buffer, receivers: VoiceConnection[]) => receivers.forEach((connection) => connection.playOpusPacket(packet));
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер завершит песню, он возвратит эту функцию
     * @param message {ClientMessage} Сообщение с сервера
     */
    protected onIdlePlayer = (message: ClientMessage): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        if (!queue || queue?.songs?.length <= 0) return null;

        setImmediate(() => {
            isRemoveSong(queue);
            if (queue.options.random) client.queue.swap(0, Math.floor(Math.random() * queue.songs.length), "songs", guild.id);

            return this.playStream(message);
        });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер выдает ошибку, он возвратит эту функцию
     * @param err {Error | string} Ошибка
     * @param message {ClientMessage} Сообщение с сервера
     */
    protected onErrorPlayer = (err: Error | string, message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        WarningMessage(message, queue.songs[0], err);

        if (queue.songs.length === 1) void queue.events.queue.emit("DestroyQueue", queue, message);
        if (queue.songs) this.stop();
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Уничтожаем все что внутри плеера
     */
    public destroy = () => {
        if (this.subscribers) {
            this.subscribers.forEach(({connection}) => connection.destroy());
            delete this.subscribers;
        }
        if (this._state) delete this._state;

        this.removeAllListeners();
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем Opus поток
 * @param song {Song} Трек
 * @param audioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @param seek {number} Пропуск музыки до 00:00:00
 */
async function CreateResource(song: Song, audioFilters: AudioFilters = null, seek: number = 0): Promise<FFmpegStream> {
    if (!song.format?.url) await FindResource(song);

    if (song.isLive) return new FFmpegStream(song.format.url);

    return new FFmpegStream(song.format.url, audioFilters, seek);
}
//====================== ====================== ====================== ======================
/**
 * @description Повтор музыки
 * @param queue {Queue} Очередь сервера
 */
function isRemoveSong({options, songs}: Queue): void {
    if (options.loop === "song") return;
    else if (options.loop === "songs") {
        const repeat = songs.shift();
        songs.push(repeat);
    } else songs.shift();
}
//====================== ====================== ====================== ======================

/**
 * @description Все статусы
 */
type PlayerState = PlayerStateBuffering | PlayerStateIdle | PlayerStatePaused | PlayerStatePlaying;

/**
 * @description Статус в котором плеер простаивает
 */
interface PlayerStateIdle {
    status: "idle",
    resource?: FFmpegStream
}

/**
 * @description Статус в котором плеер играет музыку
 */
interface PlayerStatePlaying {
    status: "playing";
    resource: FFmpegStream;

    onStreamError: (error: any) => void;
}

/**
 * @description Статус в котором плеер стоит на паузе или плеер сам решил поставить паузу поскольку нет голосовых каналов
 */
interface PlayerStatePaused {
    status: "paused" | "autoPaused";
    resource: FFmpegStream;

    onStreamError: (error: any) => void;
}

/**
 * @description Статус при котором плеер готовится к отправке пакетов
 */
interface PlayerStateBuffering {
    status: "buffering";
    resource: FFmpegStream;

    onReadableCallback: () => void;
    onFailureCallback: () => void;
    onStreamError: (error: any) => void;
}

/**
 * @description Ивенты плеера
 */
type PlayerEvents = {
    //subscribe: (subscription: PlayerSubscription) => void;
    //unsubscribe: (subscription: PlayerSubscription) => void;

    //Отслеживаемые ивенты
    idle: (oldState: PlayerState, newState: PlayerState) => void;
    paused: (oldState: PlayerState, newState: PlayerState) => void;
    buffering: (oldState: PlayerState, newState: PlayerState) => void;
    autoPaused: (oldState: PlayerState, newState: PlayerState) => void;
    playing: (oldState: PlayerState, newState: PlayerState) => void;
    error: (error: any) => void;
}