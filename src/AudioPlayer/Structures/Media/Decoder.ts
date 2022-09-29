import {AudioFilters} from "../Queue/Queue";
import {FFmpeg} from "./FFmpeg";
import {opus} from "prism-media";

//Все доступные типы декодирования аудио
export namespace Decoder {
    export function createAudioResource(audio: string, seek: number = 0, filters: AudioFilters = []) {
        const DecodeFFmpeg = new Decoder.All({url: audio, seek, filters});
        //Удаляем поток следую Decoder.All<events>
        ["close", "end", "error"].forEach((event: string) => DecodeFFmpeg.once(event, () => {
            [DecodeFFmpeg].forEach((clas) => typeof clas !== "string" && clas !== undefined ? clas.destroy() : null);
        }));

        return DecodeFFmpeg;
    }
    //С помощью FFmpeg конвертирует любой формат в opus
    export class All extends opus.OggDemuxer {
        readonly #FFmpeg: FFmpeg.FFmpeg;
        readonly #TimeFrame: number = 20;
        #started = false;
        #playbackDuration = 0;

        //Общее время проигрывание текущего ресурса
        public get duration() { return parseInt((this.#playbackDuration / 1000).toFixed(0)) };
        public get hasStarted() { return this.#started; }; //Проверяем можно ли читать поток
        /**
         * @description Декодируем в opus
         * @param parameters {Options}
         * @requires {ArgsHelper}
         */
        public constructor(parameters: {url: string, seek?: number, filters?: AudioFilters}) {
            super({autoDestroy: false});
            this.#FFmpeg = new FFmpeg.FFmpeg(ArgsHelper.createArgs(parameters.url, parameters?.filters, parameters?.seek));
            this.#FFmpeg.pipe(this); //Загружаем из FFmpeg'a в opus.OggDemuxer

            //Проверяем сколько времени длится пакет
            if (parameters?.filters?.length > 0) this.#TimeFrame = ArgsHelper.timeFrame(parameters?.filters);
            if (parameters.seek > 0) this.#playbackDuration = parameters.seek * 1e3;

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

            if (packet) this.#playbackDuration += this.#TimeFrame;

            return packet;
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Чистим память!
         */
        public readonly _destroy = (): void => {
            if (!this.#FFmpeg?.destroyed) this.#FFmpeg?.destroy();
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
}

//Вспомогательные функции Decoder'а
namespace ArgsHelper {
    /**
     * @description Создаем аргументы для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @param url {string} Ссылка
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    export function createArgs (url: string, AudioFilters: AudioFilters, seek: number): FFmpeg.Arguments {
        let thisArgs = ["-reconnect", 1, "-reconnect_streamed", 1, "-reconnect_delay_max", 5];
        const audioDecoding = ["-c:a", "libopus", "-f", "opus"];
        const audioBitrate = ["-b:a", "256k"];

        if (seek) thisArgs = [...thisArgs, "-ss", seek ?? 0];
        if (url) thisArgs = [...thisArgs, "-i", url];

        //Всегда есть один фильтр <AudioFade>
        return [...thisArgs, "-compression_level", 10, ...audioDecoding, ...audioBitrate, "-af", parseFilters(AudioFilters), "-preset:a", "ultrafast"];
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