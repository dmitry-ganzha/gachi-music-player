import JsonFFmpeg from "../../../../../DataBase/FFmpeg.json";
import {FFmpeg} from "./FFmpeg";
import {AudioFilters} from "../Queue/Queue";
import {opus} from "prism-media";

//Сюда после запуска файла будут записаны статичные фильтры. Статичные фильтры - фильтры в которых модификатор скорости записан и его не может указать пользователь
let FiltersStatic = {};

//Загружаем статичные фильтры
(() => {
    Object.entries(JsonFFmpeg.FilterConfigurator).forEach(([key, object]) => {
        if ("speedModification" in object) FiltersStatic = {...FiltersStatic, [key]: object.speedModification};
    });
})();

//Все доступные типы декодирования аудио
export namespace Decoder {
    /**
     * С помощью FFmpeg конвертирует любой формат в opus
     */
    export class All extends opus.OggDemuxer {
        readonly #FFmpeg: FFmpeg.FFmpeg;
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
         * @requires {DecoderUtils}
         */
        public constructor(parameters: {url: string, seek?: number, Filters?: AudioFilters}) {
            super();
            //Даем FFmpeg'у, ссылку с которой надо скачать поток
            this.#FFmpeg = new FFmpeg.FFmpeg(DecoderUtils.CreateArguments(parameters.url, parameters?.Filters, parameters?.seek));
            this.#FFmpeg.pipe(this); //Загружаем из FFmpeg'a в декодер

            //Проверяем сколько времени длится пакет
            this.#TimeFrame = DecoderUtils.timeFrame(parameters?.Filters);

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
}

//Вспомогательные функции Decoder'а
namespace DecoderUtils {
    /**
     * @description Создаем аргументы для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @param url {string} Ссылка
     * @param seek {number} Пропуск музыки до 00:00:00
     * @constructor
     */
    export function CreateArguments (url: string, AudioFilters: AudioFilters, seek: number): FFmpeg.Arguments {
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
    export function timeFrame(AudioFilters: AudioFilters) {
        let NumberDuration = 20;

        if (AudioFilters) AudioFilters.forEach((filter: string | number) => {
            //Если filter число, пропускаем!
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
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем фильтры для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @constructor
     */
    function CreateFilters(AudioFilters: AudioFilters): string {
        const response: Array<string> = [];

        if (AudioFilters) AudioFilters.forEach((name: string | number) => {
            if (typeof name === "number") return;
            //@ts-ignore
            const Filter = JsonFFmpeg.FilterConfigurator[name];

            if (Filter) {
                //Если у <Filter.value> указано false (Аргументы не нужны)
                if (Filter.value === false) return response.push(Filter.arg);

                //Получаем номер фильтра
                const IndexFilter = AudioFilters.indexOf(name);
                //Добавляем в response, фильтр + аргумент
                response.push(`${Filter.arg}${AudioFilters.slice(IndexFilter + 1)[0]}`);
            }
        });

        //Более плавное включение музыки
        response.push(JsonFFmpeg.Args.Filters.AudioFade);

        return response.join(",");
    }
}