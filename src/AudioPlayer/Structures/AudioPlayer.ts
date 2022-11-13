import {TypedEmitter} from "tiny-typed-emitter";
import {VoiceConnection} from "@discordjs/voice";
import {OpusAudio} from "./Media/OpusAudio";

//Статусы при которых можно пропустить трек
export const StatusPlayerHasSkipped: Set<string> = new Set(["read", "pause", "idle"]);
const SilentFrame: Buffer = Buffer.from([0xf8, 0xff, 0xfe, 0xfae]);
//Ивенты которые плеер может вернуть
interface PlayerEvents {
    read: () => any;
    pause: () => any;
    autoPause: () => any;
    idle: () => any;
    error: (error: Error | string, skipSong: boolean) => void;
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

    //Общее время проигрывания музыки
    public get streamDuration() { return this._state?.stream?.duration ?? 0 };

    //Все голосовые каналы к которым подключен плеер
    public get voices() { return this._voices; };

    //Смена действий плеера
    public get state() { return this._state; };
    public set state(state) {
        const oldState = this._state;
        const oldStatus = oldState.status, newStatus = state.status;
        const oldStream = oldState.stream, newStream = state.stream;

        //Удаляем не используемый поток
        if (oldStatus !== "idle" && newStatus === "idle" && oldStream) oldStream.cleanup();

        //Заставляем ивенты работать
        if (oldStatus !== newStatus || oldStatus !== "idle" && newStatus === "read" && oldStream !== newStream) {
            this.#readBuffer(SilentFrame);
            this.emit(newStatus);
        }

        //Задаем время для отправки пакета
        this._time = Date.now();
        this._state = state;

        //Запускаем таймер
        this.#CycleStep();
    };
    //Если нет голосового канала добавить, если есть удалить
    public voice = (voice: VoiceConnection): void => {
        const index = this._voices.indexOf(voice);

        if (index === -1) this._voices.push(voice);
        else this._voices.splice(index);
    };

    //Начинаем чтение стрима
    public readStream = (stream: PlayerStatus["stream"]) => {
        if (!stream) return this.emit("error", new Error(`Stream is null`), true);

        //Если прочитать возможно
        if (stream.readable) this.state = {status: "read", stream};
        else {
            //Включаем поток когда можно будет начать читать
            stream.once("readable", () => {
                //Удаляем прошлый поток если введен новый
                if (this.state?.stream && !this.state?.stream?.destroyed) this.state?.stream?.destroy();

                this.state = {status: "read", stream};
            });
            //Если происходит ошибка, то продолжаем читать этот же поток
            stream.once("error", () => this.emit("error", new Error("Fail read stream"), true));
        }
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

    //Отправляем пакет в голосовой канал или ставим setSpeaking false на все голосовые каналы
    readonly #readBuffer = (packet: Buffer | "silent"): void => this.voices.forEach((voice) => {
        if (packet === "silent") voice.setSpeaking(false);
        else if (voice.state.status === "ready") voice.playOpusPacket(packet);
    });

    //Создаем таймер с помощью которого отправляем пакеты в голосовые каналы
    readonly #CycleStep = (): void => {
        if (this.state?.status === "idle") return;

        //Включаем следующий трек
        if (!this.state?.stream?.readable) return void (this.state = {status: "idle"});

        //Соблюдая правила отправляем пакет
        this.#hasPlay();
        setTimeout(this.#CycleStep, this._time - Date.now());
    };

    //Проверяем можно ли отправить пакет в голосовой канал
    readonly #hasPlay = (): void => {
        const state = this.state;
        this._time += 20; //Добавляем к задержке отправки пакета 20 ms

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
        if (state.status === "autoPause") return [SilentFrame, "silent"].forEach(this.#readBuffer);

        //Отправка музыкального пакета
        if (state.status === "read") {
            const packet: Buffer | null = state.stream?.read();

            //Если есть аудио пакет отправляем во все голосовые каналы к которым подключен плеер
            if (packet) return this.#readBuffer(packet);
            this.#readBuffer("silent");
            this.stop();
        }
    };

    public readonly cleanup = () => {
        delete this._time;
        delete this._state;
        delete this._voices;
    };
}