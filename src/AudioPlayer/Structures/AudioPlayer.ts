import {VoiceConnection} from "@discordjs/voice";
import {TypedEmitter} from "tiny-typed-emitter";
import {OpusAudio} from "@OpusAudio";
import {PlayerCycle} from "@Managers/Players/CycleStep";

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
    private _voice: VoiceConnection;
    private _state: PlayerStatus = {status: "idle"};

    //====================== ====================== ====================== ======================
    /**
     * @description Общее время проигрывания музыки
     */
    public get streamDuration() { return this.state?.stream?.duration ?? 0 };
    //====================== ====================== ====================== ======================
    /**
     * @description Все голосовые каналы к которым подключен плеер
     */
    public get voice() { return this._voice; };
    public set voice(voice) { this._voice = voice; };
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
            oldState.stream.stream.destroy();
            oldState.stream.stream.read(); //Устраняем утечку памяти
            oldState.stream.destroy();
        }

        //Перезаписываем state
        delete this._state;
        this._state = state;

        //Заставляем ивенты работать
        if (oldStatus !== newStatus || oldStatus !== "idle" && newStatus === "read") {
            this.sendPacket(SilentFrame);
            this.emit(newStatus);
            PlayerCycle.toRemove(this);
        }

        PlayerCycle.toPush(this);
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
        if (stream.readable) return void (this.state = {status: "read", stream});

        //Включаем поток когда можно будет начать читать
        stream.stream.once("readable", () => {
            this.sendPacket(SilentFrame);
            this.state = {status: "read", stream};
        });
        //Если происходит ошибка, то продолжаем читать этот же поток
        stream.stream.once("error", () => this.emit("error", new Error("Fail read stream"), true));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Передача пакетов в голосовые каналы
     * @param packet {null} Пакет
     * @private
     */
    public sendPacket = (packet: Buffer | null) => {
        const voiceConnection = this.voice;

        if (packet && voiceConnection.state.status === "ready") voiceConnection.playOpusPacket(packet);
        else voiceConnection.setSpeaking(false);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаление неиспользованных данных
     */
    public destroy = () => {
        delete this._voice;
        delete this._state;

        PlayerCycle.toRemove(this);
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Аргументы для удаления аудио потока
 */
function isDestroy(oldS: PlayerStatus, newS: PlayerStatus): boolean {
    if (!oldS.stream || oldS.stream?.destroyed) return false;

    if ((oldS.status === "read" && newS.status === "pause" || oldS.status === "pause" && newS.status === "read") && oldS.stream === newS.stream) return false;
    else if (oldS.status !== "idle" && newS.status === "read") return true;
    else if (oldS.status === "read" && newS.status === "idle") return true;

    return false;
}