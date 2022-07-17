import JsonFFmpeg from "../../../../../DataBase/FFmpeg.json";
import {CreateFilters, FFmpeg, FFmpegArgs} from "./FFmpeg";
import {AudioFilters} from "../Queue/Queue";
import {OggDemuxer} from "./OggDemuxer";

/**
 * @name FFmpegDecoder<OggDemuxer>
 * Создает интеграцию с <OggDemuxer> и <FFmpeg>
 */
export class FFmpegDecoder extends OggDemuxer {
    readonly #FFmpeg: FFmpeg;
    readonly #TimeFrame: number;
    #started = false;
    #playbackDuration = 0;

    //Общее время проигрывание текущего ресурса
    public get duration() {
        return this.#playbackDuration;
    };
    public set duration(duration: number) {
        this.#playbackDuration = duration;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Проверяем можно ли читать поток
     */
    public get hasStarted() {
        return this.#started;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Декодируем в opus
     * @param parameters {Options}
     */
    public constructor(parameters: {url: string, seek?: number, Filters?: AudioFilters}) {
        super();
        //Даем FFmpeg'у, ссылку с которой надо скачать поток
        this.#FFmpeg = new FFmpeg(CreateArguments(parameters.url, parameters?.Filters, parameters?.seek));
        this.#FFmpeg.pipe(this); //Загружаем из FFmpeg'a в декодер

        //Проверяем сколько времени длится пакет
        this.#TimeFrame = FFmpegTimer(parameters?.Filters);

        //Когда можно будет читать поток записываем его в <this.#started>
        this.once("readable", () => (this.#started = true));
        //Если в <this.playStream> будет один из этих статусов, чистим память!
        ["end", "close", "error"].forEach((event) => this.once(event, this.destroy));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем пакет и проверяем не пустой ли он если не пустой к таймеру добавляем 20 мс
     */
    public readonly read = (): Buffer | null => {
        const packet: Buffer = super.read();

        if (packet) this.duration += this.#TimeFrame;

        return packet;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Чистим память!
     */
    public readonly _destroy = (): void => {
        if (this.#FFmpeg) this.#FFmpeg.destroy();
        if (!super.destroyed) super.destroy();

        //Удаляем с задержкой (чтоб убрать некоторые ошибки)
        setTimeout(() => {
            if (this && !this?.destroyed) {
                super.destroy();
                this?.removeAllListeners();
                this?.destroy();
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
    let thisArgs = [...JsonFFmpeg.Args.Reconnect, "-vn", ...JsonFFmpeg.Args.Seek, seek ?? 0];
    if (url) thisArgs = [...thisArgs, "-i", url];

    //Всегда есть один фильтр <AudioFade>
    return [...thisArgs, "-af", CreateFilters(AudioFilters), ...JsonFFmpeg.Args.OggOpus, ...JsonFFmpeg.Args.DecoderPreset];
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
    if (AudioFilters.includes("nightcore")) {
        const Arg = JsonFFmpeg.FilterConfigurator["nightcore"].arg;
        const number = Arg.split("*")[1].split(",")[0];

        NumberDuration *= Number(number);
    }

    //Фильтр <speed>
    if (AudioFilters.includes("speed")) {
        const Index = AudioFilters.indexOf("speed") + 1;
        const number = AudioFilters.slice(Index);

        NumberDuration *= Number(number);
    }

    //Фильтр <vaporwave>
    if (AudioFilters.includes("vaporwave")) {
        const Arg = JsonFFmpeg.FilterConfigurator["vaporwave"].arg;
        const number1 = Arg.split("*")[1].split(",")[0];
        const number2 = Arg.split(",atempo=")[1];

        NumberDuration *= Number(number1 + number2);
    }

    return NumberDuration;
}