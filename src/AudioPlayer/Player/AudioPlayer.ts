import {TypedEmitter} from "tiny-typed-emitter";
import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {Decoder} from "../Structures/Media/Decoder";
import {Queue} from "../Structures/Queue/Queue";
import {PlayersManager} from "../Manager/PlayerManager";

export const StatusPlayerHasSkipped: Set<string> = new Set(["playing", "paused", "buffering", "idle"]);
const SilentFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe]);

interface AudioPlayerEvents {
    idle: (oldState: PlayerState, newState: PlayerState) => void;
    paused: (oldState: PlayerState, newState: PlayerState) => void;
    autoPaused: (oldState: PlayerState, newState: PlayerState) => void;
    resume: (oldState: PlayerState, newState: PlayerState) => void;
    buffering: (oldState: PlayerState, newState: PlayerState) => void;
    playing: (oldState: PlayerState, newState: PlayerState) => void;
    error: (error: Error | string) => void;

    StartPlaying: (seek: number) => void;
}

//Аудио плеер за основу взят из @discordjs/voice
export class AudioPlayer extends TypedEmitter<AudioPlayerEvents> {
    #state: PlayerState = {status: "idle"};
    readonly #voices: VoiceConnection[] = []; //Голосовые каналы

    //Все голосовые каналы к которым подключен плеер
    public get voices() {
        return this.#voices;
    };

    //Текущее время плеера в мс
    public get playbackDuration() {
        if (this.state.stream?.duration <= 0) return 0;
        return parseInt((this.state.stream?.duration / 1000).toFixed(0));
    };
    public set playbackDuration(time: number) {
        this.state.stream.duration = time * 1e3;
    };
    //Заменяет или выдает статистику плеера
    public set state(newState: PlayerState) {
        const oldState = this.#state; //Старая статистика плеера
        const isNewResources = oldState.status !== "idle" && newState.status === "playing" && oldState.stream !== newState.stream;

        //Если статус повторяется и при этом добавлен новый поток то
        if (this.#state.status === newState.status && isNewResources) {
            this.emit("error", "[AudioPlayer]: TypedError: Loop status. Reason: skip this song!");
            return;
        }

        this.#state = newState; //Обновляем статистику плеера

        //Если пользователь пропустил трек или введен новый поток удаляем старый
        if (oldState.status === "playing" && newState.status === "idle" || oldState.status !== "idle" && oldState.stream !== newState.stream) {
            if (newState.status !== "paused") { //Если это не пауза, то удаляем поток
                oldState.stream.destroy();
                delete oldState.stream;
            }
        }

        //Если статус "idle"
        if (newState.status === "idle") {
            this.#signalStopSpeaking();
            PlayersManager.toRemove(this); //Удаляем плеер
        }
        //Если есть поток добавляем плеер обратно
        if (newState.stream) PlayersManager.toPush(this);

        if (oldState.status !== newState.status || isNewResources) {
            //Перед сменой статуса плеера отправляем пустой пакет. Необходим, так мы правим повышение задержки гс!
            this.#sendPackets(SilentFrame);
            this.emit(newState.status, oldState, newState);
        }
    };
    public get state(): PlayerState {
        return this.#state;
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
     * @description Убираем из <this.#voices> голосовой канал
     * @param connection {VoiceConnection} Голосовой канал на котором будет играть музыка
     */
    public readonly subscribe = (connection: VoiceConnection): void => {
        const FindVoiceChannel = this.#voices?.find((sub) => sub === connection);

        //Если не найден в <this.#subscribers> то добавляем
        if (!FindVoiceChannel) this.#voices.push(connection);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем из <this.#voices> голосовой канал
     * @param subscription {PlayerSubscription} Голосовой канал на котором больше не будет играть музыка
     */
    public readonly unsubscribe = (subscription: PlayerSubscription | {connection: VoiceConnection}): void => {
        const index = this.#voices.indexOf(subscription.connection);

        //Если был найден отключаемый голосовой канал, то удаляем из <this.#voices>
        if (index !== -1) {
            this.#voices.splice(index, 1);
            subscription.connection.setSpeaking(false);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description PlayCallback - Включаем трек, ищет исходник трека
     * @param queue {Queue} Очередь
     * @param seek {number} Со скольки включить трек
     */
    public readonly play = (queue: Queue, seek: number = 0) => {
        const CurrentSong = queue.songs[0];

        //Если нет трека, то удаляем очередь
        if (!CurrentSong) return queue.cleanup();
        const Audio = CurrentSong.resource(seek, queue.audioFilters);
        Audio.then((audio) => {
            if (!audio?.url) return this.emit("error", "[AudioPlayer]: Audio resource not found!");

            return this.#readStream(Decoder.createAudioResource(audio, seek, CurrentSong.isLive ? [] : queue.audioFilters))
        });
        Audio.catch((err) => this.emit("error", `[AudioPlayer]: ${err}`));

        this.emit("StartPlaying", seek);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Что делает плеер в соответствии со статусами
     */
    protected readonly CheckStatusPlayer = (): void => {
        const state = this.state;
        //Если статус (idle или buffering или paused) прекратить выполнение функции
        if (state.status === "idle" || state.status === "buffering" || state.status === "paused") return;

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (this.#voices.length === 0) {
            this.state = { ...this.state, status: "autoPaused" };
            return;
        } else if (this.state.status === "autoPaused" && this.#voices.length > 0) {
            //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
            this.state = { ...this.state, status: "playing", stream: this.state.stream };
        }

        //Не читать пакеты при статусе плеера (autoPaused)
        if (state.status === "autoPaused") {
            this.#sendPackets(SilentFrame);
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
     * @description Читаем поток
     * @param stream {PlayerResource} Входящий поток для чтения
     */
    readonly #readStream = (stream: PlayerResource): void => {
        if (!stream) return void this.emit("error", "[AudioPlayer]: Audio resource not found. Stream is null!");

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
     */
    readonly #sendPackets = (paket: Buffer): void => {
        const VoiceChannels = this.#voices.filter((connection) => connection.state.status === "ready");
        VoiceChannels.forEach((connection) => connection.playOpusPacket(paket));
    };
    //Выключаем голос бота на всех голосовых каналах
    readonly #signalStopSpeaking = (): void => this.#voices.forEach((connection) => connection.setSpeaking(false));
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
    };
}