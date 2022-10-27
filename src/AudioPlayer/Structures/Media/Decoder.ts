import {AudioFilters} from "../Queue/Queue";
import {FFmpeg} from "./FFmpeg";
import {opus} from "prism-media";
import {Readable} from "stream";
import fs from "fs";

/**
 * @description Конвертируем аудио в ogg/opus
 */
export class Decoder extends opus.OggDemuxer {
    readonly #streams: Array<Readable | FFmpeg.FFmpeg> = [];
    readonly #timeFrame: number = 20;
    #playbackDuration: number = 0;
    #started = false;

    public constructor(options: { url: string, seek?: number, filters?: AudioFilters }) {
        super({autoDestroy: false, highWaterMark: 12});
        let args;
        const resource = this.#choiceResource(options.url);

        //Что из себя представляет resource
        if (typeof resource === "string") args = ArgsHelper.createArgs(options.url, options?.filters, options?.seek);
        else args = ArgsHelper.createArgs(null, options?.filters, options?.seek);

        //Создаем ffmpeg
        this.ffmpeg = new FFmpeg.FFmpeg(args);

        //Если resource является Readable то загружаем его в ffmpeg
        if (resource instanceof Readable) {
            resource.pipe(this.ffmpeg);
            this.#streams.push(resource);
        }

        this.ffmpeg.pipe(this); //Загружаем из FFmpeg'a в opus.OggDemuxer

        //Проверяем сколько времени длится пакет
        if (options?.filters?.length > 0) this.#timeFrame = ArgsHelper.timeFrame(options?.filters);
        if (options.seek > 0) this.#playbackDuration = options.seek * 1e3;

        //Когда можно будет читать поток записываем его в <this.#started>
        this.once("readable", () => (this.#started = true));
        //Если в <this.playStream> будет один из этих статусов, чистим память!
        ["end", "close", "error"].forEach((event) => this.once(event, this.destroy));
    };

    //Общее время проигрывание текущего ресурса
    public get duration() { return parseInt((this.#playbackDuration / 1000).toFixed(0)); };
    //Проверяем можно ли читать поток
    public get hasStarted() { return this.#started; };

    //Выдаем или добавляем ffmpeg из this.streams
    private get ffmpeg() { return this.#streams[0] as FFmpeg.FFmpeg; };
    private set ffmpeg(ffmpeg) { this.#streams.push(ffmpeg); };

    //Выдаем Buffer
    public read = () => {
        const packet: Buffer = super.read();

        if (packet) this.#playbackDuration += this.#timeFrame;

        return packet;
    };

    //Что из себя представляем входной аргумент path
    readonly #choiceResource = (path: string): string | Readable => path.endsWith("opus") ? fs.createReadStream(path) : path;

    //Удаляем лишние данные
    public _destroy(error?: Error | null, callback?: (error: (Error | null)) => void) {
        super._destroy(error, callback);
        this.destroy(error);

        this.#streams.forEach((stream) => {
            if (!stream?.destroyed) stream?.destroy();

            const index = this.#streams.indexOf(stream);
            if (index !== -1) this.#streams.splice(index, 0);
        });
    };
}

//Вспомогательные функции Decoder'а
namespace ArgsHelper {
    /**
     * @description Создаем аргументы для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @param url {string} Ссылка
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    export function createArgs(url: string, AudioFilters: AudioFilters, seek: number): FFmpeg.Arguments {
        let thisArgs = ["-reconnect", 1, "-reconnect_streamed", 1, "-reconnect_delay_max", 5];
        const audioDecoding = ["-c:a", "libopus", "-f", "opus"];
        const audioBitrate = ["-b:a", "256k"];

        if (seek) thisArgs = [...thisArgs, "-ss", seek ?? 0];
        if (url) thisArgs = [...thisArgs, "-i", url];

        //Всегда есть один фильтр <AudioFade>
        return [...thisArgs, "-compression_level", 10,
            ...audioDecoding, ...audioBitrate,
            "-af", parseFilters(AudioFilters), "-preset:a", "ultrafast"
        ];
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем множитель времени для правильного отображения. При добавлении новых аргументов в Filters.json<FilterConfigurator>, их нужно тоже добавить сюда!
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     */
    export function timeFrame(AudioFilters: AudioFilters) {
        let NumberDuration = 20;

        if (AudioFilters) AudioFilters.forEach((filter: string | number) => {
            //Если filter число, пропускаем!
            if (typeof filter === "number") return;

            const findFilter = FFmpeg.getFilter(filter);

            if (findFilter?.speed) {
                if (typeof findFilter.speed === "number") NumberDuration *= Number(findFilter.speed);
                else {
                    const Index = AudioFilters.indexOf(filter) + 1; //Позиция <filter> в AudioFilters
                    const number = AudioFilters.slice(Index); //Получаем то что указал пользователь

                    NumberDuration *= Number(number);
                }
            }
        });

        return NumberDuration;
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем фильтры для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     */
    function parseFilters(AudioFilters: AudioFilters): string {
        const response: Array<string> = [];

        //Более плавное включение музыки
        response.push("afade=t=in:st=0:d=1.5");

        if (AudioFilters) AudioFilters.forEach((filter: string | number) => {
            if (typeof filter === "number") return;

            const Filter = FFmpeg.getFilter(filter);

            if (Filter) {
                if (!Filter.args) return response.push(Filter.filter);

                const indexFilter = AudioFilters.indexOf(filter);
                response.push(`${Filter.filter}${AudioFilters.slice(indexFilter + 1)[0]}`)
            }
        });

        return response.join(",");
    }
}