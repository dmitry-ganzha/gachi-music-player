import {Readable, Writable} from "stream";
import {AudioFilters, CreateFilters, FFmpeg, FFmpegArgs} from '.';
import FFmpegConfiguration from "../../../../DataBase/FFmpeg.json";
import {opus} from "prism-media";

type TypeStream = "ogg/opus" | "webm/opus" | "ffmpeg";

interface Options {
    stream: Readable | string;
    seek?: number;
    Filters?: AudioFilters;
    type?: TypeStream;
}

export class ConstructorStream {
    public playbackDuration = 0;
    public playStream: Readable & Writable;
    #FFmpeg: FFmpeg = null;
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
     * @param options {Options}
     */
    public constructor(options: Options) {
        setImmediate(() => this.#TimeFrame = this.#TimeFrame * FFmpegTimer(options?.Filters) || 20);
        //Даем FFmpeg'у, ссылку с которой надо скачать поток
        if (typeof options.stream === "string") {
            this.#FFmpeg = new FFmpeg(CreateArguments(options.stream, options?.Filters, options?.seek));
            this.playStream = new opus.OggDemuxer({autoDestroy: true});

            this.#FFmpeg.pipe(this.playStream);
        } else {
            //Расшифровываем входной поток, добавляем аргументы если они есть, пропускаем время в песне!
            if (options.Filters || options.seek || options.type === 'ffmpeg') {
                this.#FFmpeg = new FFmpeg(CreateArguments(null, options?.Filters, options?.seek));
                this.playStream = new opus.OggDemuxer({autoDestroy: true});

                options.stream.pipe(this.#FFmpeg);
                this.#FFmpeg.pipe(this.playStream);
            //Расшифровываем из ogg/opus в opus, без фильтров и пропуска
            } else if (options.type === 'ogg/opus') {
                this.playStream = new opus.OggDemuxer({autoDestroy: true});
                options.stream.pipe(this.playStream);
            //Расшифровываем из webm/opus в opus, без фильтров и пропуска
            } else if (options.type === 'webm/opus') {
                this.playStream = new opus.WebmDemuxer({autoDestroy: true});
                options.stream.pipe(this.playStream);
            }
        }

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
        if (this.#FFmpeg) {
            this.#FFmpeg.destroy();
        }

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

    if (url) Arg = [...Arg, '-i', url];

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
        const Index = AudioFilters.indexOf('speed') + 1;
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