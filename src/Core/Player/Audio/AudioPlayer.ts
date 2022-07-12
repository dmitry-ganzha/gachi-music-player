import {EventEmitter} from "node:events";
import {FindResource} from "./FindResource";
import {AudioFilters, Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {ClientMessage} from "../../Client";
import {getVoiceConnection, PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {addAudioPlayer, deleteAudioPlayer} from "../Manager/PlayersManager";
import {JoinVoiceChannel} from "../Structures/Voice";
import {ErrorPlayerMessage, PlaySongMessage} from "../Manager/MessagePlayer";
import {FFmpegDecoder} from "../Structures/Media/FFmpegDecoder";

//Статусы плеера для пропуска музыки
export const StatusPlayerHasSkipped: Set<string> = new Set(["playing", "paused", "buffering", "idle"]);
const EmptyFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe]);

/**
 * @description Плеер. За основу взять с <discordjs voice>. Немного изменен!
 */
export class AudioPlayer extends EventEmitter {
    #_state: PlayerState = { status: "idle" };
    #subscribers: PlayerSubscription[] = [];

    //====================== ====================== ====================== ======================
    /**
     * @description Текущее время плеера в мс
     */
    public get playbackDuration() {
        if (this.state.resource?.duration <= 0) return 0;
        return parseInt((this.state.resource?.duration / 1000).toFixed(0));
    };
    private set playbackDuration(time: number) {
        this.state.resource.duration = time * 1e3;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Голосовые каналы в которых можно включить музыку
     */
    get #VoiceChannels() {
        return this.#subscribers.filter(( {connection} ) => connection.state.status === "ready").map(({connection}) => connection);
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
    public get state() { return this.#_state; };
    protected set state(newState: PlayerState) {
        const OldState = this.#_state; //Старая статистика плеера
        const newResource = newState?.resource; //Новый поток. Есть ли он?

        if (OldState.status !== "idle" && OldState.resource !== newResource) setImmediate(OldState.resource.destroy);

        //Удаляем плеер если статус "idle"
        if (newState.status === "idle") {
            this.#signalStopSpeaking();
            deleteAudioPlayer(this);
        }
        if (newResource) addAudioPlayer(this);

        const isNewResources = OldState.status !== "idle" && newState.status === "playing" && OldState.resource !== newState.resource;
        this.#_state = newState; //Обновляем статистику плеера

        if (OldState.status !== newState.status || isNewResources) {
            //Перед сменой статуса плеера отправляем пустой пакет. Необходим, так мы правим повышение задержки гс!
            this.#playOpusPacket(EmptyFrame, this.#VoiceChannels);
            void this.emit(newState.status, OldState, this.#_state);
        }
    };
    //====================== ====================== ====================== ======================
    public constructor(msg: ClientMessage) {
        super();
        this.on("idle", () => this.#onIdlePlayer(msg));
        this.on("error", (err: any) => this.#onErrorPlayer(err, msg));
        //this.on("autoPaused", () => this.#onAutoPaused(msg));
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

        //Получаем исходный поток
        CreateResource(queue.songs[0], queue.audioFilters, seek).then(stream => {
            this.#play(stream);
            if (seek) this.playbackDuration = seek;
        });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Включаем музыку
     * @param message {ClientMessage} Сообщение с сервера
     */
    public PlayCallback = (message: ClientMessage): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        //Если нет музыки в очереди или нет самой очереди, завершаем проигрывание!
        if (!queue || !queue.songs || !queue.songs.length) return void queue?.events?.queue?.emit("DestroyQueue", queue, message);

        //Получаем исходный поток
        CreateResource(queue.songs[0], queue.audioFilters).then(stream => {
            this.#play(stream);
            client.console(`[QueueID: ${guild.id}]: ${queue.songs[0].title}`);

            //Если стрим не пустышка отправляем сообщение
            if (stream instanceof FFmpegDecoder) PlaySongMessage(queue.channels.message);
        });
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
     * @description Убираем из <this.subscribers> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    public subscribe = (connection: VoiceConnection): void => {
        const FindVoiceChannel = this.#subscribers.find((sub) => sub.connection === connection);

        //Если не найден в <this.#subscribers> то добавляем
        if (!FindVoiceChannel) {
            const PlayerSub = new PlayerSubscription(connection, this as any);
            this.#subscribers.push(PlayerSub);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param subscription {PlayerSubscription} Голосовой канал на котором больше не будет играть музыка
     */
    public unsubscribe = (subscription?: PlayerSubscription): void => {
        if (!subscription) return void (this.#subscribers = null);

        const index = this.#subscribers.indexOf(subscription);

        //Если был найден отключаемый голосовой канал, то удаляем из <this.#subscribers>
        if (index !== -1) {
            this.#subscribers.splice(index, 1);
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

            //Если есть аудио пакет отправляем во все голосовые каналы к которым подключен плеер
            if (packet) return this.#playOpusPacket(packet, Receivers);
            this.#signalStopSpeaking();
            this.stop();
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Что бот будет отправлять в гс
     * @param resource {PlayerResource} Поток
     * @private
     */
    #play = (resource: PlayerResource): void => {
        if (!resource) return void this.emit("error", "[AudioResource]: has not found!");
        if (resource?.ended) return void this.emit("error", "[AudioPlayer]: Fail to load stream");

        //Если произойдет ошибка в чтении потока
        const onStreamError = (error: Error) => {
            if (this.state.status !== "idle") void this.emit("error", error);
            if (this.state.status !== "idle" && this.state.resource === resource) this.state = { status: "idle" };
        };

        //Если можно включить поток
        if (resource.hasStarted) this.state = { status: "playing", resource, onStreamError };
        else {
            //Как только можно будет прочитать поток
            const onReadableCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "playing", resource, onStreamError };
            };
            //Если невозможно прочитать поток
            const onFailureCallback = () => {
                if (this.state.status === "buffering" && this.state.resource === resource) this.state = { status: "idle" };
            };

            //Когда возможно будет прочитать поток, включаем его в голосовой канал
            resource.playStream.once("readable", onReadableCallback);
            ["end", "close", "finish"].forEach((event: string) => resource.playStream.once(event, onFailureCallback));
            this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Перестаем передавать пакеты во все доступные каналы
     * @private
     */
    #signalStopSpeaking = (): void => this.#subscribers.forEach(({connection} ) => connection.setSpeaking(false));
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем пакет во все доступные каналы
     * @param packet {Buffer} Сам пакет
     * @param receivers {VoiceConnection[]} В какие каналы отправить пакет
     * @private
     */
    #playOpusPacket = (packet: Buffer, receivers: VoiceConnection[]): void => receivers.forEach((connection) => connection.playOpusPacket(packet));
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер завершит песню, он возвратит эту функцию
     * @param message {ClientMessage} Сообщение с сервера
     * @private
     */
    #onIdlePlayer = (message: ClientMessage): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        setTimeout(() => {
            if (queue?.songs) isRemoveSong(queue); //Определяем тип loop

            //Рандомим номер трека, просто меняем их местами
            if (queue?.options?.random) client.queue.swap(0, Math.floor(Math.random() * queue.songs.length), "songs", guild.id);

            return this.PlayCallback(message); //Включаем трек
        }, 700);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер выдает ошибку, он возвратит эту функцию
     * @param err {Error | string} Ошибка
     * @param message {ClientMessage} Сообщение с сервера
     * @private
     */
    #onErrorPlayer = (err: Error | string, message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Выводим сообщение об ошибке
        ErrorPlayerMessage(message, queue.songs[0], err);
        return this.stop(); //Останавливаем плеер
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Если вдруг что-то произойдет с подключением к голосовому каналу, будет произведено переподключение!
     * @param message {ClientMessage} Сообщение с сервера
     * @private
     */
    #onAutoPaused = (message: ClientMessage) => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const VoiceChannel = getVoiceConnection(message.guildId);

        //Бота принудительно отключили, не подключаемся
        if (!VoiceChannel) {
            queue.events.queue.DestroyQueue(queue, message, true);
            return;
        }

        //Подключаемся к прошлому голосовому каналу
        const connection = JoinVoiceChannel(queue.channels.voice);

        //Если поток еще не читаемый
        if (!this.state.resource.hasStarted) return;

        //Если голосовых каналов подключенных к плееру более 1
        if (this.#subscribers.length > 0) {
            const subscribe = this.#subscribers.find((sub) => sub.connection === connection);
            if (subscribe) this.unsubscribe(subscribe);
        }

        this.subscribe(connection); //Добавляем голосовой канал
        queue.channels.connection = connection; //Записываем данные подключения в очередь
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Уничтожаем все что внутри плеера
     */
    public destroy = () => {
        if (this.#subscribers) this.#subscribers.forEach(({connection}) => connection?.destroy());
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
    return new Promise(async (resolve) => {
        if (req > 4) return resolve(null);

        const CheckResource = await FindResource(song);
        const RetryCheck = () => { //Повторно делаем запрос
            req++;
            return CreateResource(song, audioFilters, seek, req);
        };

        //Если выходит ошибка или нет ссылки на исходный ресурс
        if (CheckResource instanceof Error || !song.format?.url) return RetryCheck();
        if (song.isLive) { //Если будет включен поток
            seek = 0;
            audioFilters = [];
        }

        //Отправляем данные для дальнейшей загрузки
        return resolve(new FFmpegDecoder({url: song.format.url, seek, Filters: audioFilters}));
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Повтор музыки
 * @param queue {Queue} Очередь сервера
 */
function isRemoveSong({options, songs}: Queue): void {
    switch (options?.loop) {
        case "song": return;
        case "songs": {
            const repeat = songs.shift();
            songs.push(repeat);
            return;
        }
        default: {
            songs.shift();
            return;
        }
    }
}
//====================== ====================== ====================== ======================

/**
 * @description Все статусы
 */
type PlayerState = PlayerStateBuffering | PlayerStateIdle | PlayerStatePaused | PlayerStatePlaying;
type PlayerResource = FFmpegDecoder;

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
export interface AudioPlayer extends EventEmitter {
    //Плеер ожидает дальнейших действий
    idle: (oldState: PlayerState, newState: PlayerState) => void;
    //Плеер ожидает
    paused: (oldState: PlayerState, newState: PlayerState) => void;
    //Плеер загружает аудио поток
    buffering: (oldState: PlayerState, newState: PlayerState) => void;
    //Плеер ставит сам себя на паузу
    autoPaused: (oldState: PlayerState, newState: PlayerState) => void;
    //Плеер воспроизводит музыку в голосовой канал
    playing: (oldState: PlayerState, newState: PlayerState) => void;
    //Плеер не может продолжить воспроизведение музыки из-за ошибки
    error: (error: any) => void;
}