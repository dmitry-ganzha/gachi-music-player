import {Readable, Writable} from "stream";
import {opus} from "prism-media";
import FFmpegConfiguration from "../../../../DataBase/FFmpeg.json";
import {CreateFilters, FFmpeg, FFmpegArgs} from "./Media/FFmpeg";
import {AudioFilters} from "./Queue/Queue";

/**
 * @name FFmpegDecoder
 * @description
 */
export class FFmpegDecoder {
    public playbackDuration = 0;
    public playStream: Readable & Writable;
    #FFmpeg: FFmpeg;
    #started = false;
    #TimeFrame = 20;
    //====================== ====================== ====================== ======================
    /**
     * @description Проверяем можно ли читать поток
     */
    public get hasStarted() {
        return this.#started;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Для проверки, читабельный ли стрим
     */
    public get readable() {
        return this.playStream.readable;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Для проверки, закончился ли стрим ресурса
     */
    public get ended() {
        return this.playStream?.readableEnded || this.playStream?.destroyed || !this.playStream;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description
     * @param parameters {Options}
     */
    public constructor(parameters: {url: string, seek?: number, Filters?: AudioFilters}) {
        setImmediate(() => this.#TimeFrame = this.#TimeFrame * FFmpegTimer(parameters?.Filters) || 20);
        //Даем FFmpeg'у, ссылку с которой надо скачать поток
        this.#FFmpeg = new FFmpeg(CreateArguments(parameters.url, parameters?.Filters, parameters?.seek));
        this.playStream = new opus.OggDemuxer({autoDestroy: true, objectMode: true});

        this.#FFmpeg.pipe(this.playStream);

        this.playStream.once("readable", () => (this.#started = true));
        ["end", "close", "error"].forEach((event) => this.playStream.once(event, this.destroy));
        return;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем пакет и проверяем не пустой ли он если не пустой к таймеру добавляем 20 мс
     */
    public read = (): Buffer | null => {
        const packet: Buffer = this.playStream?.read();
        if (packet) this.playbackDuration += this.#TimeFrame;

        return packet;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Чистим память!
     */
    public destroy = (): void => {
        if (this.#FFmpeg) this.#FFmpeg.destroy();

        //Delete other
        delete this.playbackDuration;

        setTimeout(() => {
            if (this.playStream && !this.playStream?.destroyed) {
                this.playStream?.removeAllListeners();
                this.playStream?.destroy();
            }
            delete this.playStream;
        }, 125);
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем аргументы для FFmpeg
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @param url {string} Ссылка
 * @param seek {number} Пропуск музыки до 00:00:00
 * @constructor
 */
function CreateArguments (url: string, AudioFilters: AudioFilters, seek: number): FFmpegArgs {
    let Arg = [...FFmpegConfiguration.Args.Reconnect, "-vn", ...FFmpegConfiguration.Args.Seek, seek ?? 0];

    if (url) Arg = [...Arg, "-i", url];

    if (AudioFilters) return [...Arg, "-af", CreateFilters(AudioFilters), ...FFmpegConfiguration.Args.OggOpus, ...FFmpegConfiguration.Args.DecoderPreset];
    return [...Arg, ...FFmpegConfiguration.Args.OggOpus, ...FFmpegConfiguration.Args.DecoderPreset];
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем множитель времени для правильного отображения. При добавлении новых аргументов в FFmpeg.json<FilterConfigurator>, их нужно тоже добавить сюда!
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @constructor
 */
function FFmpegTimer(AudioFilters: AudioFilters) {
    if (!AudioFilters) return null;
    let NumberDuration = 0;

    if (AudioFilters.indexOf("nightcore") >= 0) {
        const Arg = FFmpegConfiguration.FilterConfigurator["nightcore"].arg;
        const number = Arg.split("*")[1].split(",")[0];

        NumberDuration += Number(number);
    }

    if (AudioFilters.indexOf("speed") >= 0) {
        const Index = AudioFilters.indexOf("speed") + 1;
        const number = AudioFilters.slice(Index);

        NumberDuration += Number(number);
    }

    if (AudioFilters.indexOf("vaporwave")) {
        const Arg = FFmpegConfiguration.FilterConfigurator["vaporwave"].arg;
        const number1 = Arg.split("*")[1].split(",")[0];
        const number2 = Arg.split(",atempo=")[1];

        NumberDuration += Number(number1 + number2);
    }
    return NumberDuration;
}