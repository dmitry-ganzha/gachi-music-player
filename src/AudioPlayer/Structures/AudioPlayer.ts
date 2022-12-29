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
    private time: number = 0;

    //====================== ====================== ====================== ======================
    /**
     * @description Общее время проигрывания музыки
     */
    public get streamDuration() { return this.state?.stream?.duration ?? 0 };
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

        //Проверяем на нужный статус, удаляем старый поток
        if (isDestroy(oldState, state)) {
            oldState.stream.destroy();
            oldState.stream.read();
        }

        //Перезаписываем state
        delete this._state;
        this._state = state;

        //Задаем время начала (когда плеер начал отправлять пакеты)
        this.time = Date.now() + AudioPlayerSettings.sendDuration;
        //Запускаем таймер
        this.CycleStep();

        //Заставляем ивенты работать
        if (oldStatus !== newStatus || oldStatus !== "idle" && newStatus === "read") {
            this.sendPacket(SilentFrame);
            this.emit(newStatus);
        }
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
                this.sendPacket(SilentFrame);
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
    private sendPacket = (packet: Buffer | null) => {
        for (const voice of this.voices) {
            if (packet && voice.state.status === "ready") voice.playOpusPacket(packet);
            else voice.setSpeaking(false);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверяем можно ли отправить пакет в голосовой канал
     * @private
     */
    private hasPlay = () => {
        this.time += 20; //Добавляем время отправки следующего пакета
        const state = this.state;

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

            this.sendPacket(packet);
            if (!packet) this.stop();
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем таймер с помощью которого отправляем пакеты в голосовые каналы
     * @private
     */
    private CycleStep = (): void => {
        const state = this.state;
        if (state?.status === "idle" || !state?.status) return;

        //Включаем следующий трек
        if (!state?.stream?.readable) return void (this.state = {status: "idle"});

        //Соблюдая правила отправляем пакет
        this.hasPlay();
        setTimeout(this.CycleStep, this.time - Date.now());
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаление неиспользованных данных
     */
    public destroy = () => {
        delete this._voices;
        delete this.time;
        delete this._state;
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Аргументы для удаления аудио потока
 */
function isDestroy(oldS: PlayerStatus, newS: PlayerStatus): boolean {
    if (!oldS.stream || oldS.stream?.destroyed) return false;

    if (oldS.status !== "idle" && newS.status === "read") return true;
    else if (oldS.status === "read" && newS.status === "idle") return true;
    //else if (oldS.status === "")

    return false;
}