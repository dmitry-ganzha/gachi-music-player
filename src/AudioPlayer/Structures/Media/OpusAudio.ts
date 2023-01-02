import {DuplexOptions, Readable} from "stream";
import {Music, Debug} from "@db/Config.json";
import {consoleTime} from "@Client/Client";
import {AudioFilters} from "@Queue/Queue";
import {FFspace} from "@FFspace";
import {opus} from "prism-media";
import fs from "fs";

type FFmpegOptions = {seek?: number, filters?: AudioFilters};

//Резервируем в памяти
const Audio = Music.Audio;

export class OpusAudio extends opus.OggDemuxer {
    private _streams: Array<Readable> = []; private _ffmpeg: FFspace.FFmpeg;
    private _duration: number = 0;
    private _readable: boolean = false;
    private _durFrame: number = 20;

    //====================== ====================== ====================== ======================
    /**
     * @description Время проигрывания в секундах
     * @type {number}
     */
    public get duration() { return parseInt((this._duration / 1e3).toFixed(0)); };
    //====================== ====================== ====================== ======================
    /**
     * @description Возможно ли прочитать поток
     * @type {boolean}
     */
    // @ts-ignore
    public get readable(): boolean { return this._readable; };
    //====================== ====================== ====================== ======================
    /**
     * @description Выдаем или добавляем ffmpeg из this.streams
     * @type {FFspace.FFmpeg}
     * @private
     */
    private get ffmpeg() { return this._ffmpeg as FFspace.FFmpeg; };
    private set ffmpeg(ffmpeg: FFspace.FFmpeg) { this._ffmpeg = ffmpeg; };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем поток при помощи ffmpeg конвертируем любой файл в opus
     * @param path {string} Ссылка или путь до файла. Условие чтоб в конце пути был .opus
     * @param options {FFmpegOptions} Настройки FFmpeg, такие, как seek, filter
     * @param duplexOptions {DuplexOptions} Настройки node Stream
     */
    public constructor(path: string, options: FFmpegOptions, duplexOptions: DuplexOptions = {}) {
        super({autoDestroy: false, ...duplexOptions});
        const resource = ArgsHelper.choiceResource(path);

        //Создаем ffmpeg
        this.ffmpeg = new FFspace.FFmpeg(ArgsHelper.choiceArgs(path, typeof resource, options));

        //Если resource является Readable то загружаем его в ffmpeg
        if (resource instanceof Readable) {
            resource.pipe(this.ffmpeg);
            this._streams.push(resource);
        }
        this.ffmpeg.pipe(this); //Загружаем из FFmpeg'a в opus.OggDemuxer

        //Проверяем сколько времени длится пакет
        if (options?.filters?.length > 0) this._durFrame = ArgsHelper.timeFrame(options?.filters);
        if (options.seek > 0) this._duration = options.seek * 1e3;

        //Когда можно будет читать поток записываем его в <this.#started>
        this.once("readable", () => (this._readable = true));
        //Если в <this> будет один из этих статусов, чистим память!
        ["end", "close", "error"].forEach((event: string) => this.once(event, this.destroy));

        if (Debug) consoleTime(`[Debug] -> OpusAudio: [Start decoding file in ${path}]`);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Чтение пакета
     */
    public read = (): Buffer | null => {
        const packet: Buffer = super.read();

        if (packet) this._duration += this._durFrame;

        return packet;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем неиспользованные объекты
     * @param error {Error} Если удаление происходит из-за ошибки
     */
    public _destroy = (error?: Error | null): void => {
        super.destroy(error);
        super.read(); //Устраняем утечку памяти

        delete this._duration;
        delete this._readable;
        delete this._durFrame;

        if (this._streams?.length > 0) {
            for (const stream of this._streams) {
                if (stream !== undefined && !stream.destroyed) {
                    stream.destroy();
                    stream.read(); //Устраняем утечку памяти
                }
            }
        }
        delete this._streams;

        if (this.ffmpeg.deletable) {
            this.ffmpeg.destroy();
            this.ffmpeg.read(); //Устраняем утечку памяти
        }
        delete this.ffmpeg;

        if (Debug) consoleTime(`[Debug] -> OpusAudio: [Clear memory]`);
    };
}

//Вспомогательные функции Decoder'а
namespace ArgsHelper {
    //Что из себя представляем входной аргумент path
    export function choiceResource(path: string): string | Readable {
        return path.endsWith("opus") ? fs.createReadStream(path) : path;
    }
    //Создаем аргументы в зависимости от типа resource
    export function choiceArgs(url: string, resource: string | Readable, options: FFmpegOptions): FFspace.Arguments {
        if (resource === "string") return createArgs(url, options?.filters, options?.seek);
        return createArgs(null, options?.filters, options?.seek);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем аргументы для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @param url {string} Ссылка
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    export function createArgs(url: string, AudioFilters: AudioFilters, seek: number): FFspace.Arguments {
        const thisArgs = ["-reconnect", 1, "-reconnect_streamed", 1, "-reconnect_delay_max", 5];
        const audioDecoding = ["-c:a", "libopus", "-f", "opus"];
        const audioBitrate = ["-b:a", Audio.bitrate];

        if (seek) thisArgs.push("-ss", seek ?? 0);
        if (url) thisArgs.push( "-i", url);

        //Всегда есть один фильтр <AudioFade>
        return [...thisArgs, "-compression_level", 12,
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

            const findFilter = FFspace.getFilter(filter);

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
        response.push("afade=t=in:st=0:d=3");

        if (AudioFilters) AudioFilters.forEach((filter: string | number) => {
            if (typeof filter === "number") return;

            const Filter = FFspace.getFilter(filter);

            if (Filter) {
                if (!Filter.args) return response.push(Filter.filter);

                const indexFilter = AudioFilters.indexOf(filter);
                response.push(`${Filter.filter}${AudioFilters.slice(indexFilter + 1)[0]}`);
            }
        });

        return response.join(",");
    }
}