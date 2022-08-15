import {TypedEmitter} from "tiny-typed-emitter";
import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {Decoder} from "../Structures/Media/Decoder";
import {ClientMessage} from "../../Client";
import {AudioFilters, Queue} from "../Structures/Queue/Queue";
import {MessagePlayer} from "../Manager/MessagePlayer";
import {Song} from "../Structures/Queue/Song";
import {Searcher} from "../Manager/Resource/Searcher";
import {PlayersManager} from "../Manager/PlayersManager";

export const StatusPlayerHasSkipped: Set<string> = new Set(["playing", "paused", "buffering", "idle"]);
const EmptyFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe]);

interface AudioPlayerEvents {
    idle: (oldState: PlayerState, newState: PlayerState) => void;
    paused: (oldState: PlayerState, newState: PlayerState) => void;
    autoPaused: (oldState: PlayerState, newState: PlayerState) => void;
    resume: (oldState: PlayerState, newState: PlayerState) => void;
    buffering: (oldState: PlayerState, newState: PlayerState) => void;
    playing: (oldState: PlayerState, newState: PlayerState) => void;
    error: (error: Error | string) => void;
}

/**
 * Аудио плеер за основу взят из @discordjs/voice
 */
export class AudioPlayer extends TypedEmitter<AudioPlayerEvents> {
    #_state: PlayerState = {status: "idle"};
    readonly #_voices: VoiceConnection[] = []; //Голосовые каналы
    /**
     * @description Текущее время плеера в мс
     */
    public get playbackDuration() {
        if (this.state.stream?.duration <= 0) return 0;
        return parseInt((this.state.stream?.duration / 1000).toFixed(0));
    };
    private set playbackDuration(time: number) {
        this.state.stream.duration = time * 1e3;
    };
    //Заменяет или выдает статистику плеера
    public set state(state: PlayerState) {
        const OldState = this.#_state; //Старая статистика плеера
        const isNewResources = OldState.status !== "idle" && state.status === "playing" && OldState.stream !== state.stream;

        this.#_state = state; //Обновляем статистику плеера

        //Если пользователь пропустил трек или введен новый поток удаляем старый
        if (OldState.status === "playing" && state.status === "idle" || OldState.status !== "idle" && OldState.stream !== state.stream) {
            OldState.stream.destroy();
            delete OldState.stream;
        }

        //Если статус "idle"
        if (state.status === "idle") {
            this.#signalStopSpeaking();
            PlayersManager.toRemove(this); //Удаляем плеер
        }
        //Если есть поток добавляем плеер обратно
        if (state.stream) PlayersManager.toPush(this);

        if (OldState.status !== state.status || isNewResources) {
            //Перед сменой статуса плеера отправляем пустой пакет. Необходим, так мы правим повышение задержки гс!
            this.#sendPackets(EmptyFrame);
            void this.emit(state.status, OldState, state);
        }
    };
    public get state(): PlayerState {
        return this.#_state;
    };

    //Ставим на паузу плеер
    public pause = () => {
        if (this.state.status !== "playing") return;
        this.state = { ...this.state, status: "paused" };
    };
    //Убираем с паузы плеер
    public resume = () => {
        if (this.state.status !== "paused") return;
        this.state = { ...this.state, status: "playing" };
    };
    //Останавливаем воспроизведение текущего трека
    public stop = () => {
        if (this.state.status === "idle") return;
        this.state = { status: "idle" };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.#_voices> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    public readonly subscribe = (connection: VoiceConnection): void => {
        const FindVoiceChannel = this.#_voices?.find((sub) => sub === connection);

        //Если не найден в <this.#subscribers> то добавляем
        if (!FindVoiceChannel) this.#_voices.push(connection);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.#_voices> голосовой канал
     * @param subscription {PlayerSubscription} Голосовой канал на котором больше не будет играть музыка
     */
    public readonly unsubscribe = (subscription?: PlayerSubscription): void => {
        const index = this.#_voices.indexOf(subscription.connection);

        //Если был найден отключаемый голосовой канал, то удаляем из <this.#_voices>
        if (index !== -1) {
            this.#_voices.splice(index, 1);
            subscription.connection.setSpeaking(false);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description PlayCallback - Включаем трек, ищет исходник трека
     * @param message {ClientMessage} Сообщение
     * @param seek {number} Со скольки включить трек
     */
    public readonly play = (message: ClientMessage, seek: number = 0) => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);
        const song = queue?.songs[0];

        if (song) {
            //Получаем исходный поток
            CreateResource(song, queue.audioFilters, seek).then(stream => {
                this.#readStream(stream);

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
     * @description PlayerCallback - Что делает плеер в соответствии со статусами
     * @constructor
     */
    protected readonly CheckStatusPlayer = (): void => {
        const state = this.state;
        //Если статус (idle или buffering или paused) прекратить выполнение функции
        if (state.status === "idle" || state.status === "buffering") return;

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (this.#_voices.length === 0) {
            this.state = { ...this.state, status: "autoPaused" };
            return;
        } else if (this.state.status === "autoPaused" && this.#_voices.length > 0) {
            //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
            this.state = { ...this.state, status: "playing", stream: this.state.stream };
        }

        //Не читать пакеты при статусе плеера (autoPaused | paused)
        if (state.status === "autoPaused" || state.status === "paused") {
            this.#sendPackets(EmptyFrame);
            this.#signalStopSpeaking();
            return;
        }

        //Отправка музыкального пакета
        if (this.state.status === "playing") {
            const packet: Buffer | null = this.state.stream?.read();

            //Если есть аудио пакет отправляем во все голосовые каналы к которым подключен плеер
            if (packet) return this.#sendPackets(packet);
            this.#signalStopSpeaking();
            this.stop();
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Читаем стрим
     * @param stream {PlayerResource} Входящий поток для чтения
     * @private
     */
    readonly #readStream = (stream: PlayerResource): void => {
        if (!stream) return void this.emit("error", "[AudioPlayer]: stream is null");

        if (stream.hasStarted) this.state = {status: "playing", stream};
        else {
            //Как только можно будет прочитать поток
            const onReadableCallback = () => {
                if (this.state.status === "buffering" && this.state.stream === stream) this.state = { status: "playing", stream };
            };
            //Если невозможно прочитать поток
            const onFailureCallback = () => {
                if (this.state.status === "buffering" && this.state.stream === stream) this.state = { status: "idle" };
            };

            stream.once("readable", onReadableCallback);
            ["end", "close", "finish"].forEach((event: string) => stream.once(event, onFailureCallback));
            this.state = {status: "buffering", stream};
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Фильтрует голосовые и отправляет в них аудио пакеты
     * @param paket {Buffer} Аудио пакет
     * @private
     */
    readonly #sendPackets = (paket: Buffer): void => {
        const VoiceChannels = this.#_voices.filter((connection) => connection.state.status === "ready");
        VoiceChannels.forEach((connection) => connection.playOpusPacket(paket));
    };
    //Выключаем голос бота на всех голосовых каналах
    readonly #signalStopSpeaking = (): void => this.#_voices.forEach((connection) => connection.setSpeaking(false));
}

//====================== ====================== ====================== ======================
/**
 * @description Создаем Opus поток
 * @param song {Song} Трек
 * @param audioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @param seek {number} Пропуск музыки до 00:00:00
 */
function CreateResource(song: Song, audioFilters: AudioFilters = null, seek: number = 0): Promise<PlayerResource | null> {
    const Resource = Searcher.toCheckResource(song);

    return Resource.then((format: Song["format"]) => {
        if (!format) return null;

        let LiveStream: Decoder.Dash, params: {url: string | Decoder.Dash, seek?: number, filters?: AudioFilters};

        //Если будет включен поток
        if (song.isLive) {
            LiveStream = new Decoder.Dash(format.url, song.url);
            params = {url: LiveStream};
        } else params = {url: format.url, seek, filters: audioFilters};

        //Следую параметра начинам расшифровку
        const DecodeFFmpeg = new Decoder.All(params);

        //Удаляем поток следую Decoder.All<events>
        ["close", "end", "error"].forEach(event => DecodeFFmpeg.once(event, () => {
            [DecodeFFmpeg, LiveStream].forEach((clas) => {
                if (clas !== undefined) clas.destroy();
            });
        }));

        return DecodeFFmpeg;
    });
}

type PlayerState = PlayerStates["idle"] | PlayerStates["pause"] | PlayerStates["playing"] | PlayerStates["buffering"] | PlayerStates["error"];
type PlayerResource = Decoder.All; //Все декодировщики доступные к чтению

interface PlayerStates {
    idle: { //Плеер ожидает
        status: "idle";
        stream?: PlayerResource;
    };
    pause: { //Плеер стоит на паузе
        status: "paused" | "autoPaused";
        stream?: PlayerResource;
    };
    buffering: { //Плеер ждет когда можно начать читать поток
        status: "buffering";
        stream: PlayerResource;
    };
    playing: { //Плеер читает поток
        status: "playing";
        stream?: PlayerResource
    };
    error: { //Плеер выводит ошибку
        status: "error";
        stream?: PlayerResource
    }
}