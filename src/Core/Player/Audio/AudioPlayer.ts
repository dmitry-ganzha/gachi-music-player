import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {AudioFilters, Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {ClientMessage} from "../../Client";
import {Decoder} from "../Structures/Media/Decoder";
import {MessagePlayer} from "../Manager/MessagePlayer";
import {PlayersManager} from "../Manager/PlayersManager";
import {TypedEmitter} from "tiny-typed-emitter";
import {Searcher} from "../Manager/Resource/Searcher";

//Статусы плеера для пропуска музыки
export const StatusPlayerHasSkipped: Set<string> = new Set(["playing", "paused", "buffering", "idle"]);
const EmptyFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe]);

/**
 * @description Плеер. За основу взять с <discordjs voice>. Немного изменен!
 */
export class AudioPlayer extends TypedEmitter<AudioPlayerEvents> {
    #_state: PlayerState = { status: "idle" };
    readonly #subscribers: Array<PlayerSubscription> = [];

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

        if (OldState.status !== "idle" && OldState.resource !== newResource) {
            OldState.resource.destroy();
            OldState.resource.read();
            delete OldState.resource;
        }

        //Удаляем плеер если статус "idle"
        if (newState.status === "idle") {
            this.#signalStopSpeaking();
            PlayersManager.toRemove(this);
        }
        if (newResource) PlayersManager.toPush(this);

        const isNewResources = OldState.status !== "idle" && newState.status === "playing" && OldState.resource !== newState.resource;
        this.#_state = newState; //Обновляем статистику плеера

        if (OldState.status !== newState.status || isNewResources) {
            //Перед сменой статуса плеера отправляем пустой пакет. Необходим, так мы правим повышение задержки гс!
            this.#playOpusPacket(EmptyFrame, this.#VoiceChannels);
            void this.emit(newState.status, OldState, this.#_state);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Включаем музыку
     * @param message {ClientMessage} Сообщение с сервера
     * @param seek {number} Пропуск музыки до 00:00:00
     * @requires {CreateResource}
     */
    public readonly play = (message: ClientMessage, seek: number = 0): void => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);
        const song = queue?.songs[0];

        if (song) {
            //Получаем исходный поток
            CreateResource(song, queue.audioFilters, seek).then(stream => {
                this.#toPlayResource(stream);

                //Если это не пропуск
                if (!seek) {
                    //Отправляем лог о текущем треке
                    client.console(`[GuildID: ${guild.id}]: ${song.title}`);
                    //Если стрим не пустышка отправляем сообщение
                    if (stream instanceof Decoder.All) MessagePlayer.toPlay(queue.channels.message);
                } else this.playbackDuration = seek; //Если есть пропуск меняем время
            });
        } else if (queue?.emitter) queue.emitter.emit("DeleteQueue", message);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Приостанавливаем отправку пакетов в голосовой канал
     */
    public readonly pause = (): void => {
        if (this.state.status !== "playing") return;
        this.state = { ...this.state, status: "paused" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Продолжаем отправлять пакеты в голосовой канал
     */
    public readonly resume = (): void => {
        if (this.state.status !== "paused") return;
        this.state = { ...this.state, status: "playing" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Пропускаем текущий трек
     */
    public readonly stop = (): void => {
        if (this.state.status === "idle") return;
        this.state = { status: "idle" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.subscribers> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    public readonly subscribe = (connection: VoiceConnection): void => {
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
    public readonly unsubscribe = (subscription?: PlayerSubscription): void => {
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
    protected readonly CheckStatusPlayer = (): void => {
        //Если статус (idle или buffering) прекратить выполнение функции
        if (this.state.status === "idle" || this.state.status === "buffering" || this.state.status === "paused") return;

        //Голосовые каналы к которым подключен плеер
        const Receivers = this.#VoiceChannels;

        //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
        if (this.state.status === "autoPaused" && Receivers.length > 0) this.state = { ...this.state, status: "playing" };

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (Receivers.length === 0) {
            this.state = { ...this.state, status: "autoPaused" };
            return;
        }

        //Не читать пакеты при статусе плеера (paused | autoPaused)
        if (this.state.status === "paused" || this.state.status === "autoPaused") {
            this.#playOpusPacket(EmptyFrame, Receivers);
            this.#signalStopSpeaking();
            return;
        }

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
     * @param resource {PlayerResource | Error} Поток или ошибка из-за которой невозможно включить трек
     * @private
     */
    readonly #toPlayResource = (resource: PlayerResource | Error): void => {
        if (!resource || resource instanceof Error) {
            this.emit("error", "[AudioPlayer]: not found track resource");
            return;
        }

        //Если произойдет ошибка в чтении потока
        const onStreamError = (error: Error) => {
            if (this.state.status !== "idle") this.emit("error", error);
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
            resource.once("readable", onReadableCallback);
            ["end", "close", "finish"].forEach((event: string) => resource.once(event, onFailureCallback));
            this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Перестаем передавать пакеты во все доступные каналы
     * @private
     */
    readonly #signalStopSpeaking = (): void => this.#subscribers.forEach(({connection} ) => connection.setSpeaking(false));
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем пакет во все доступные каналы
     * @param packet {Buffer} Сам пакет
     * @param receivers {VoiceConnection[]} В какие каналы отправить пакет
     * @private
     */
    readonly #playOpusPacket = (packet: Buffer, receivers: VoiceConnection[]): void => receivers.forEach((connection) => connection.playOpusPacket(packet));
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем Opus поток
 * @param song {Song} Трек
 * @param audioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @param seek {number} Пропуск музыки до 00:00:00
 */
function CreateResource(song: Song, audioFilters: AudioFilters = null, seek: number = 0): Promise<PlayerResource | null> {
    const Resource = Searcher.getResourceSong(song);

    return Resource.then((format: Song["format"]) => {
        if (!format) return null;

        let LiveStream: Decoder.Dash, params: {url: string | Decoder.Dash, seek?: number, Filters?: AudioFilters};

        //Если будет включен поток
        if (song.isLive) {
            LiveStream = new Decoder.Dash(format.url, song.url);
            params = {url: LiveStream};
        } else params = {url: format.url, seek, Filters: audioFilters};

        //Следую параметра начинам расшифровку
        const DecodeFFmpeg = new Decoder.All(params);

        //Удаляем поток следую Decoder.All<events>
        ["close", "end", "error"].forEach(event => DecodeFFmpeg.once(event, () => {
            [DecodeFFmpeg, LiveStream].forEach((clas) => {
                if (!clas?.destroyed && clas !== undefined) clas?.destroy();
            });
        }));

        return DecodeFFmpeg;
    });
}
//====================== ====================== ====================== ======================

/**
 * @description Все статусы
 */
type PlayerState = PlayerStateBuffering | PlayerStateIdle | PlayerStatePaused | PlayerStatePlaying;
type PlayerResource = Decoder.All;

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
interface AudioPlayerEvents {
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
    error: (error: string | Error) => void;
}