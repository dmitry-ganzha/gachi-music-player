import {VoiceConnection} from "@discordjs/voice";
import {TypedEmitter} from "tiny-typed-emitter";
import {Music} from "@db/Config.json";
import {OpusAudio} from "@OpusAudio";

const AudioPlayerSettings = Music.AudioPlayer;

//Статусы при которых можно пропустить трек
export const StatusPlayerHasSkipped: Set<string> = new Set(["read", "pause", "idle"]);
const SilentFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe, 0xfae]);
//Ивенты которые плеер может вернуть
interface PlayerEvents {
    read: () => any;
    pause: () => any;
    autoPause: () => any;
    idle: () => any;
    error: (error: Error, skipSong: boolean) => void;
}

//Статусы и тип потока
interface PlayerStatus {
    status: "read" | "pause" | "idle" | "error" | "autoPause";
    stream?: OpusAudio;
}

export class AudioPlayer extends TypedEmitter<PlayerEvents> {
    private _voices: VoiceConnection[] = [];
    private _state: PlayerStatus = {status: "idle"};
    private _time: number;

    /**
     * @description Общее время проигрывания музыки
     */
    public get streamDuration() { return this._state?.stream?.duration ?? 0 };
    //====================== ====================== ====================== ======================
    /**
     * @description Все голосовые каналы к которым подключен плеер
     */
    public get voices() { return this._voices; };
    //====================== ====================== ====================== ======================
    /**
     * @description Смена действий плеера
     */
    public get state() { return this._state; };
    public set state(state) {
        const oldState = this._state;
        const oldStatus = oldState.status, newStatus = state.status;
        const oldStream = oldState.stream, newStream = state.stream;

        //Удаляем не используемый поток
        if (oldStatus !== "idle" && newStatus === "idle" && oldStream) oldStream.cleanup();

        //Заставляем ивенты работать
        if (oldStatus !== newStatus || oldStatus !== "idle" && newStatus === "read" && oldStream !== newStream) {
            this.#setSpeak(SilentFrame);
            this.emit(newStatus);
        }

        //Задаем время начала (когда плеер начал отправлять пакеты)
        this._time = Date.now() + AudioPlayerSettings.sendDuration;
        this._state = state;

        //Запускаем таймер
        this.#CycleStep();
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Если нет голосового канала добавить, если есть удалить
     * @param voice {VoiceConnection} Голосовое подключение
     */
    public voice = (voice: VoiceConnection): void => {
        const index = this._voices.indexOf(voice);

        if (index === -1) this._voices.push(voice);
        else this._voices.splice(index);
    };
    //Ставим на паузу плеер
    public pause = (): void => {
        if (this.state.status !== "read") return;
        this.state = {...this.state, status: "pause"};
    };
    //Убираем с паузы плеер
    public resume = (): void => {
        if (this.state.status !== "pause") return;
        this.state = {...this.state, status: "read"};
    };
    //Останавливаем воспроизведение текущего трека
    public stop = (): void => {
        if (this.state.status === "idle") return;
        this.state = {status: "idle"};
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Начинаем чтение стрима
     * @param stream {OpusAudio} Сам стрим
     */
    public readStream = (stream: PlayerStatus["stream"]) => {
        if (!stream) return this.emit("error", new Error(`Stream is null`), true);

        //Если прочитать возможно
        if (stream.readable) this.state = {status: "read", stream};
        else {
            //Включаем поток когда можно будет начать читать
            stream.once("readable", () => {
                //Удаляем прошлый поток если введен новый
                if (this.state?.stream && !this.state?.stream?.destroyed) this.state?.stream?.cleanup();

                this.#setSpeak(SilentFrame);
                this.state = {status: "read", stream};
            });
            //Если происходит ошибка, то продолжаем читать этот же поток
            stream.once("error", () => this.emit("error", new Error("Fail read stream"), true));
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Передача пакетов в голосовые каналы
     * @param packet {null} Пакет
     * @private
     */
    readonly #setSpeak = (packet: Buffer | null): void => {
        for (const voice of this.voices) {
            if (packet && voice.state.status === "ready") voice.playOpusPacket(packet);
            else voice.setSpeaking(false);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем таймер с помощью которого отправляем пакеты в голосовые каналы
     * @private
     */
    readonly #CycleStep = (): void => {
        const state = this.state;
        if (state?.status === "idle" || !state?.status) return;

        //Включаем следующий трек
        if (!state?.stream?.readable) return void (this.state = {status: "idle"});

        //Соблюдая правила отправляем пакет
        this.#hasPlay();
        setTimeout(this.#CycleStep, this._time - Date.now());
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверяем можно ли отправить пакет в голосовой канал
     * @private
     */
    readonly #hasPlay = (): void => {
        const state = this.state;
        this._time += 20; //Добавляем время отправки следующего пакета

        //Если статус (idle или pause) прекратить выполнение функции
        if (state.status === "idle" || state.status === "pause") return;

        //Если некуда проигрывать музыку ставить плеер на паузу
        if (this.voices.length === 0) {
            this.state = {...state, status: "pause"};
            return;
        } else if (state.status === "autoPause" && this.voices.length > 0) {
            //Если стоит статус плеера (autoPause) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
            this.state = {...state, status: "read", stream: state.stream};
        }

        //Не читать пакеты при статусе плеера (autoPause)
        if (state.status === "autoPause") return;

        //Отправка музыкального пакета
        if (state.status === "read") {
            const packet: Buffer | null = state.stream?.read();

            this.#setSpeak(packet);
            if (!packet) this.stop();
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Чистим плеер от ненужных данных
     */
    public readonly cleanup = (): void => {
        delete this._time;
        delete this._state;
        delete this._voices;
    };
}