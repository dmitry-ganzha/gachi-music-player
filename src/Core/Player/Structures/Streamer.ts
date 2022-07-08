import {Readable, Writable} from "stream";
import {Args, FilterConfigurator} from "../../../../DataBase/FFmpeg.json";
import {CreateFilters, FFmpeg, FFmpegArgs} from "./Media/FFmpeg";
import {AudioFilters} from "./Queue/Queue";
import {OggDemuxer} from "./Media/OggDemuxer";

/**
 * @name FFmpegDecoder
 * @description
 */
export class FFmpegDecoder {
    public playbackDuration = 0;
    public readonly playStream: Readable & Writable;
    readonly #FFmpeg: FFmpeg;
    readonly #TimeFrame: number;
    #started = false;
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
     * @description Декодируем в opus
     * @param parameters {Options}
     */
    public constructor(parameters: {url: string, seek?: number, Filters?: AudioFilters}) {
        //Проверяем сколько времени длится пакет
        this.#TimeFrame = FFmpegTimer(parameters?.Filters);
        //Даем FFmpeg'у, ссылку с которой надо скачать поток
        this.#FFmpeg = new FFmpeg(CreateArguments(parameters.url, parameters?.Filters, parameters?.seek));
        //Декодируем в чистый opus
        this.playStream = new OggDemuxer({autoDestroy: true, objectMode: true});

        this.#FFmpeg.pipe(this.playStream); //Загружаем из FFmpeg'a в декодер

        this.playStream.once("readable", () => (this.#started = true)); //Запишем когда можно брать пакеты

        //Если в <this.playStream> будет один из этих статусов, чистим память!
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

        delete this.playbackDuration;

        //Удаляем с задержкой (чтоб убрать некоторые ошибки)
        setTimeout(() => {
            if (this.playStream && !this.playStream?.destroyed) {
                this.playStream?.removeAllListeners();
                this.playStream?.destroy();
            }
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
    let thisArgs = [...Args.Reconnect, "-vn", ...Args.Seek, seek ?? 0];
    if (url) thisArgs = [...thisArgs, "-i", url];

    //Всегда есть один фильтр <AudioFade>
    return [...thisArgs, "-af", CreateFilters(AudioFilters), ...Args.OggOpus, ...Args.DecoderPreset];
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем множитель времени для правильного отображения. При добавлении новых аргументов в FFmpeg.json<FilterConfigurator>, их нужно тоже добавить сюда!
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @constructor
 */
function FFmpegTimer(AudioFilters: AudioFilters) {
    if (!AudioFilters) return null;
    let NumberDuration = 20;

    //Фильтр <nightcore>
    if (AudioFilters.indexOf("nightcore") >= 0) {
        const Arg = FilterConfigurator["nightcore"].arg;
        const number = Arg.split("*")[1].split(",")[0];

        NumberDuration *= Number(number);
    }

    //Фильтр <speed>
    if (AudioFilters.indexOf("speed") >= 0) {
        const Index = AudioFilters.indexOf("speed") + 1;
        const number = AudioFilters.slice(Index);

        NumberDuration *= Number(number);
    }

    //Фильтр <vaporwave>
    if (AudioFilters.indexOf("vaporwave")) {
        const Arg = FilterConfigurator["vaporwave"].arg;
        const number1 = Arg.split("*")[1].split(",")[0];
        const number2 = Arg.split(",atempo=")[1];

        NumberDuration *= Number(number1 + number2);
    }
    return NumberDuration;
}