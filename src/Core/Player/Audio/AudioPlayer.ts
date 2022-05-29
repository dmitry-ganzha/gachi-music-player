import {FindResource} from "./FindResource";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {TypedEmitter} from "tiny-typed-emitter";
import {ClientMessage} from "../../Client";
import {AudioFilters} from "../FFmpeg";
import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {ConstructorStream} from "../FFmpeg/ConstructorStream";
import {addAudioPlayer, deleteAudioPlayer} from "../Manager/Function/DataStore";
import {JoinVoiceChannel} from "../Manager/Voice/VoiceManager";
import {ErrorPlayerMessage, PlaySongMessage} from "../Manager/PlayerMessages";

//Статусы плеера для пропуска музыки
export const StatusPlayerHasSkipped: Set<string> = new Set(['playing', 'paused', 'buffering', 'idle']);
const EmptyFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe]);

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
    set #CurrentTime(time: number) {
        this.state.resource.playbackDuration = time * 1e3;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Голосовые каналы в которых можно включить музыку
     */
    get #VoiceChannels() {
        return this.subscribers.filter(( {connection} ) => connection.state.status === "ready").map(({connection}) => connection);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверка играет ли сейчас плеер
     */
    public get checkPlayable(): boolean {
        if (this.state.status === "idle" || this.state.status === "buffering") return false;

        //Если невозможно прочитать поток выдать false
        if (!this.state.resource?.readable) {
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
            this.#signalStopSpeaking();
            deleteAudioPlayer(this);
        }
        if (newResource) addAudioPlayer(this);

        const isNewResources = OldState.status !== "idle" && newState.status === "playing" && OldState.resource !== newState.resource;
        this._state = newState; //Обновляем статистику плеера

        if (OldState.status !== newState.status || isNewResources) {
            //Перед сменой статуса плеера отправляем пустой пакет. Необходим, так мы правим повышение задержки гс!
            this.#playOpusPacket(EmptyFrame, this.#VoiceChannels);
            void this.emit(newState.status, OldState, this._state);
        }
    };
    //====================== ====================== ====================== ======================
    public constructor(msg: ClientMessage) {
        super();
        this.on("idle", () => this.#onIdlePlayer(msg));
        this.on("error", (err: any) => this.#onErrorPlayer(err, msg));
        this.on("autoPaused", () => this.#onAutoPaused(msg));
        this.setMaxListeners(3);
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

        setImmediate(() => CreateResource(queue.songs[0], queue.audioFilters, seek).then((stream: PlayerResource) => {
                this.#play(stream);
                if (seek) this.#CurrentTime = seek;
            })
        );
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Включаем музыку
     * @param message {ClientMessage} Сообщение с сервера
     */
    public PlayCallback = (message: ClientMessage): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        if (!queue || !queue.songs || !queue.songs.length) return void queue?.events?.queue?.emit('DestroyQueue', queue, message);

        setImmediate(() => CreateResource(queue.songs[0], queue.audioFilters).then((stream: PlayerResource) => {
                client.console(`[Queue]: [GuildID: ${guild.id}, Type: ${queue.songs[0].type}, Status: Playing]: [${queue.songs[0].title}]`);
                PlaySongMessage(queue.channels.message);
                return this.#play(stream);
            })
        );
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Приостанавливаем отправку пакетов в голосовой канал
     */
    public pause = (): void => {
        if (this.state.status !== "playing") return;
        this.state = { ...this.state, status: "paused" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Продолжаем отправлять пакеты в голосовой канал
     */
    public resume = (): void => {
        if (this.state.status !== "paused") return;
        this.state = { ...this.state, status: "playing" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Пропускаем текущий трек
     */
    public stop = (): void => {
        if (this.state.status === "idle") return;
        this.state = { status: "idle" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Что будет отправлять в голосовой канал
     * @param resource {PlayerResource} Поток
     */
    #play = (resource: PlayerResource): void => {
        if (!resource) return void this.emit('error', 'Error: AudioResource has not found');
        if (resource?.ended) return void this.emit('error', `[AudioPlayer]: [Message: Fail to load a ended stream]`);

        const onStreamError = (error: Error) => {
            if (this.state.status !== "idle") void this.emit('error', error);
            if (this.state.status !== "idle" && this.state.resource === resource) this.state = { status: "idle" };
        };

        if (resource.hasStarted) this.state = { status: "playing", resource, onStreamError };
        else {
            const onReadableCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "playing", resource, onStreamError };
            };
            const onFailureCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "idle" };
            };

            resource.playStream.once('readable', onReadableCallback);
            ['end', 'close', 'finish'].forEach((event: string) => resource.playStream.once(event, onFailureCallback));
            this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    public subscribe = (connection: VoiceConnection): void => {
        const FindVoiceChannel = this.subscribers.find((sub) => sub.connection === connection);

        if (!FindVoiceChannel) {
            const PlayerSub = new PlayerSubscription(connection, this as any);
            this.subscribers.push(PlayerSub);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param subscription {PlayerSubscription} Голосовой канал на котором больше не будет играть музыка
     */
    public unsubscribe = (subscription?: PlayerSubscription): void => {
        if (!subscription) return void (this.subscribers = null);

        const index = this.subscribers.indexOf(subscription);
        const FindInIndex = index !== -1;

        if (FindInIndex) {
            this.subscribers.splice(index, 1);
            subscription.connection.setSpeaking(false);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверка перед отправкой пакета в голосовой канал
     */
    protected CheckStatusPlayer = (): void => {
        //Если статус (idle или buffering) прекратить выполнение функции
        if (this.state.status === "idle" || this.state.status === "buffering" || this.state.status === "paused") return;

        //Голосовые каналы к которым подключен плеер
        const Receivers = this.#VoiceChannels;

        //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
        if (this.state.status === "autoPaused" && Receivers.length > 0) this.state = { ...this.state, status: "playing" };

        //Не читать пакеты при статусе плеера (paused | autoPaused)
        if (this.state.status === "paused" || this.state.status === "autoPaused") {
            this.#playOpusPacket(EmptyFrame, Receivers);
            this.#signalStopSpeaking();
            return;
        }
        //Если некуда проигрывать музыку ставить плеер на паузу
        if (Receivers.length === 0) return void (this.state = { ...this.state, status: "autoPaused" });

        //Отправка музыкального пакета
        if (this.state.status === "playing") {
            const packet: Buffer | null = this.state.resource?.read();

            if (packet) return this.#playOpusPacket(packet, Receivers);
            this.#signalStopSpeaking();
            this.stop();
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Перестаем передавать пакеты во все доступные каналы
     */
    #signalStopSpeaking = (): void => this.subscribers.forEach(({connection} ) => connection.setSpeaking(false));
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем пакет во все доступные каналы
     * @param packet {Buffer} Сам пакет
     * @param receivers {VoiceConnection[]} В какие каналы отправить пакет
     */
    #playOpusPacket = (packet: Buffer, receivers: VoiceConnection[]): void => receivers.forEach((connection) => connection.playOpusPacket(packet));
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер завершит песню, он возвратит эту функцию
     * @param message {ClientMessage} Сообщение с сервера
     */
    #onIdlePlayer = (message: ClientMessage): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        setImmediate(() => {
            setTimeout(() => {
                if (queue?.songs) isRemoveSong(queue);
                if (queue?.options?.random) client.queue.swap(0, Math.floor(Math.random() * queue.songs.length), "songs", guild.id);

                return this.PlayCallback(message);
            }, 700);
        });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер выдает ошибку, он возвратит эту функцию
     * @param err {Error | string} Ошибка
     * @param message {ClientMessage} Сообщение с сервера
     */
    #onErrorPlayer = (err: Error | string, message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        ErrorPlayerMessage(message, queue.songs[0], err);
        queue.songs.shift();
        return this.PlayCallback(message);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Если вдруг что-то произойдет с подключением к голосовому каналу, будет произведено переподключение!
     * @param message {ClientMessage} Сообщение с сервера
     */
    #onAutoPaused = (message: ClientMessage) => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const connection = JoinVoiceChannel(queue.channels.voice);

        if (this.subscribers.length > 0) {
            const subscribe = this.subscribers.find((sub) => sub.connection === connection);
            if (subscribe) this.unsubscribe(subscribe);
        }

        this.subscribe(connection);
        queue.channels.connection = connection;

        if (!this.state.resource.hasStarted) return this.seek(message, this.CurrentTime);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Уничтожаем все что внутри плеера
     */
    public destroy = () => {
        if (this.subscribers) {
            this.subscribers.forEach(({connection}) => connection?.destroy());
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
 * @param req
 */
function CreateResource(song: Song, audioFilters: AudioFilters = null, seek: number = 0, req: number = 0): Promise<PlayerResource> {
    return new Promise((resolve) => {
        if (req > 2) return resolve(null);

        FindResource(song).finally(() => {
            if (!song.format?.work) return resolve(null);

            if (song.isLive) return resolve(new ConstructorStream({
                stream: song.format.url
            }));
            return resolve(new ConstructorStream({
                stream: song.format.url, seek, Filters: audioFilters
            }));
        }).catch((err) => {
            console.log(`[FindResource]: [Error: ${err}, Req: ${req}]`);
            req++;
            return resolve(CreateResource(song, audioFilters, seek, req));
        });
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Повтор музыки
 * @param queue {Queue} Очередь сервера
 */
function isRemoveSong({options, songs}: Queue): void {
    if (options?.loop === "song") return;
    else if (options?.loop === "songs") {
        const repeat = songs.shift();
        songs.push(repeat);
    } else songs.shift();
}
//====================== ====================== ====================== ======================

/**
 * @description Все статусы
 */
type PlayerState = PlayerStateBuffering | PlayerStateIdle | PlayerStatePaused | PlayerStatePlaying;
type PlayerResource = ConstructorStream;

/**
 * @description Статус в котором плеер простаивает
 */
interface PlayerStateIdle {
    status: "idle";
    resource?: PlayerResource;
}

/**
 * @description Статус в котором плеер играет музыку
 */
interface PlayerStatePlaying {
    status: "playing";
    resource: PlayerResource;

    onStreamError: (error: any) => void;
}

/**
 * @description Статус в котором плеер стоит на паузе или плеер сам решил поставить паузу поскольку нет голосовых каналов
 */
interface PlayerStatePaused {
    status: "paused" | "autoPaused";
    resource: PlayerResource;

    onStreamError: (error: any) => void;
}

/**
 * @description Статус при котором плеер готовится к отправке пакетов
 */
interface PlayerStateBuffering {
    status: "buffering";
    resource: PlayerResource;

    onReadableCallback: () => void;
    onFailureCallback: () => void;
    onStreamError: (error: any) => void;
}

/**
 * @description Ивенты плеера
 */
type PlayerEvents = {
    //Отслеживаемые ивенты
    idle: (oldState: PlayerState, newState: PlayerState) => void;
    paused: (oldState: PlayerState, newState: PlayerState) => void;
    buffering: (oldState: PlayerState, newState: PlayerState) => void;
    autoPaused: (oldState: PlayerState, newState: PlayerState) => void;
    playing: (oldState: PlayerState, newState: PlayerState) => void;
    error: (error: any) => void;
}