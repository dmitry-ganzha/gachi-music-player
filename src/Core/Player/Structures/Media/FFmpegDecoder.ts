import JsonFFmpeg from "../../../../../DataBase/FFmpeg.json";
import {CreateFilters, FFmpeg, FFmpegArgs} from "./FFmpeg";
import {AudioFilters} from "../Queue/Queue";
import {OggDemuxer} from "./OggDemuxer";

let FiltersStatic = {};

//Загружаем статичные фильтры
(() => {
    Object.entries(JsonFFmpeg.FilterConfigurator).forEach(([key, object]) => {
        if ("speedModification" in object) FiltersStatic = {...FiltersStatic, [key]: object.speedModification};
    });
})();

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
     * @requires {CreateArguments, FiltersTime}
     */
    public constructor(parameters: {url: string, seek?: number, Filters?: AudioFilters}) {
        super();
        //Даем FFmpeg'у, ссылку с которой надо скачать поток
        this.#FFmpeg = new FFmpeg(CreateArguments(parameters.url, parameters?.Filters, parameters?.seek));
        this.#FFmpeg.pipe(this); //Загружаем из FFmpeg'a в декодер

        //Проверяем сколько времени длится пакет
        this.#TimeFrame = FiltersTime(parameters?.Filters);

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
function FiltersTime(AudioFilters: AudioFilters) {
    let NumberDuration = 20;

    if (AudioFilters) AudioFilters.forEach((filter: string | number) => {
        //Если filter чисто, пропускаем!
        if (typeof filter === "number") return;

        // @ts-ignore
        const StaticFilter = FiltersStatic[filter];

        //Проверяем есть ли такой модификатор
        if (StaticFilter) {
            //Если уже указан модификатор скорости
            if (typeof StaticFilter === "number") {
                NumberDuration *= Number(StaticFilter);
            } else { //Если модификатор надо указывать пользователю
                const Index = AudioFilters.indexOf(filter) + 1; //Позиция <filter> в AudioFilters
                const number = AudioFilters.slice(Index); //Получаем то что указал пользователь

                NumberDuration *= Number(number);
            }
        }
    });

    return NumberDuration;
}