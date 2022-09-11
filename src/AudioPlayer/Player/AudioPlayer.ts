import {TypedEmitter} from "tiny-typed-emitter";
import {PlayerSubscription, VoiceConnection} from "@discordjs/voice";
import {Decoder} from "../Structures/Media/Decoder";
import {Queue} from "../Structures/Queue/Queue";
import {PlayersManager} from "../Manager/PlayerManager";

export const StatusPlayerHasSkipped: Set<string> = new Set(["playing", "paused", "idle"]);
const SilentFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe]);

interface AudioPlayerEvents {
    idle: (oldState: PlayerState, newState: PlayerState) => void;
    paused: (oldState: PlayerState, newState: PlayerState) => void;
    autoPaused: (oldState: PlayerState, newState: PlayerState) => void;
    resume: (oldState: PlayerState, newState: PlayerState) => void;
    playing: (oldState: PlayerState, newState: PlayerState) => void;
    error: (error: Error | string, skipSong: boolean) => void;

    StartPlaying: (seek: number) => void;
    BufferStream: () => void;
}

//Аудио плеер за основу взят из @discordjs/voice
export class AudioPlayer extends TypedEmitter<AudioPlayerEvents> {
    #state: PlayerState = { status: "idle" };
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

    //Заменяет или выдает статистику плеера
    public set state(newState: PlayerState) {
        const oldState = this.#state; //Старая статистика плеера
        const isNewResources = oldState.status !== "idle" && newState.status === "playing" && oldState.stream !== newState.stream;

        this.#state = newState; //Обновляем статистику плеера

        //Если пользователь пропустил трек или введен новый поток удаляем старый
        if (oldState.status === "playing" && newState.status === "idle" || oldState.status !== "idle" && oldState.stream !== newState.stream) {
            if (newState.status !== "paused") { //Если это не пауза, то удаляем поток
                oldState.stream?.destroy();
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
            if (!audio) return this.emit("error", "[AudioPlayer]: Audio resource not found!", true);

            return this.#readStream(Decoder.createAudioResource(audio, seek, CurrentSong.isLive ? [] : queue.audioFilters))
        });
        Audio.catch((err) => this.emit("error", `[AudioPlayer]: ${err}`, true));

        this.emit("StartPlaying", seek);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Что делает плеер в соответствии со статусами
     */
    protected readonly CheckStatusPlayer = (): void => {
        const state = this.state;
        //Если статус (idle или buffering или paused) прекратить выполнение функции
        if (state.status === "idle" || state.status === "paused") return;

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (this.#voices.length === 0) {
            this.state = { ...state, status: "autoPaused" };
            return;
        } else if (state.status === "autoPaused" && this.#voices.length > 0) {
            //Если стоит статус плеера (autoPaused) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
            this.state = { ...state, status: "playing", stream: state.stream };
        }

        //Не читать пакеты при статусе плеера (autoPaused)
        if (state.status === "autoPaused") {
            this.#sendPackets(SilentFrame);
            this.#signalStopSpeaking();
            return;
        }

        //Отправка музыкального пакета
        if (state.status === "playing") {
            const packet: Buffer | null = state.stream?.read();

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
        if (stream.hasStarted) this.state = { status: "playing", stream };
        else {
            //Включаем поток когда можно будет начать читать
            const onReadCallback = () => this.state = { status: "playing", stream };
            //Если происходит ошибка, то продолжаем читать этот же поток
            const onFailCallBack = () => this.emit("error", "[Decoder]: Fail readable stream!", false);

            stream.once("readable", onReadCallback);
            stream.once("error", onFailCallBack);
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
type PlayerState = PlayerStates["idle"] | PlayerStates["pause"] | PlayerStates["playing"] | PlayerStates["error"];
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
    playing: { //Плеер читает поток
        status: "playing";
        stream?: PlayerResource
    };
    error: { //Плеер выводит ошибку
        status: "error";
        stream?: PlayerResource
    };
}