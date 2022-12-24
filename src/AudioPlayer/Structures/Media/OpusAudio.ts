import {DuplexOptions, Readable} from "stream";
import {AudioFilters} from "@Queue/Queue";
import {Music} from "@db/Config.json";
import {FFspace} from "@FFspace";
import {opus} from "prism-media";
import fs from "fs";

type FFmpegOptions = {seek?: number, filters?: AudioFilters};

//Резервируем в памяти
const Audio = Music.Audio;

export class OpusAudio extends opus.OggDemuxer {
    readonly #streams: Array<Readable | FFspace.FFmpeg> = [];
    private _duration: number = 0;
    private _readable: boolean;
    private readonly _durFrame: number = 20;

    public get duration() { return parseInt((this._duration / 1e3).toFixed(0)); };
    // @ts-ignore
    public get readable(): boolean { return this._readable; };

    //Выдаем или добавляем ffmpeg из this.streams
    private get ffmpeg() { return this.#streams[0] as FFspace.FFmpeg; };
    private set ffmpeg(ffmpeg: FFspace.FFmpeg) { this.#streams.push(ffmpeg); };

    public constructor(path: string, options: FFmpegOptions, duplexOptions: DuplexOptions = {}) {
        super({autoDestroy: false, highWaterMark: 128, ...duplexOptions});
        const resource = this.#choiceResource(path);

        //Создаем ffmpeg
        this.ffmpeg = new FFspace.FFmpeg(this.#choiceArgs(path, typeof resource, options), { highWaterMark: 128 });

        //Если resource является Readable то загружаем его в ffmpeg
        if (resource instanceof Readable) {
            resource.pipe(this.ffmpeg);
            this.#streams.push(resource);
        }
        this.ffmpeg.pipe(this); //Загружаем из FFmpeg'a в opus.OggDemuxer

        //Проверяем сколько времени длится пакет
        if (options?.filters?.length > 0) this._durFrame = ArgsHelper.timeFrame(options?.filters);
        if (options.seek > 0) this._duration = options.seek * 1e3;

        //Когда можно будет читать поток записываем его в <this.#started>
        this.once("readable", () => (this._readable = true));
        //Если в <this.playStream> будет один из этих статусов, чистим память!
        ["end", "close", "error"].forEach((event: string) => this.once(event, this.destroy));
    };

    public read = () => {
        const packet: Buffer = super.read();

        if (packet) this._duration += this._durFrame;

        return packet;
    };

    //Что из себя представляем входной аргумент path
    readonly #choiceResource = (path: string): string | Readable => path.endsWith("opus") ? fs.createReadStream(path) : path;
    //Создаем аргументы в зависимости от типа resource
    readonly #choiceArgs = (url: string, resource: string | Readable, options: FFmpegOptions): FFspace.Arguments => {
        if (resource === "string") return ArgsHelper.createArgs(url, options?.filters, options?.seek);
        return ArgsHelper.createArgs(null, options?.filters, options?.seek);
    };

    //Удаляем данные которые нам больше не нужны
    public cleanup = (error?: Error | null, callback?: (error: (Error | null)) => void) => {
        super._destroy(error, callback);
        this.destroy(error);

        delete this._duration;
        delete this._readable;

        this.#streams.forEach((stream) => {
            if ("destroyed" in stream) stream?.destroy();
            this.#streams.shift();
        });
    };
    public _destroy = () => this.cleanup();
}


//Вспомогательные функции Decoder'а
namespace ArgsHelper {
    /**
     * @description Создаем аргументы для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @param url {string} Ссылка
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    export function createArgs(url: string, AudioFilters: AudioFilters, seek: number): FFspace.Arguments {
        let thisArgs = ["-reconnect", 1, "-reconnect_streamed", 1, "-reconnect_delay_max", 5];
        const audioDecoding = ["-c:a", "libopus", "-f", "opus"];
        const audioBitrate = ["-b:a", Audio.bitrate];

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